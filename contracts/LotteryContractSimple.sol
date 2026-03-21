// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LotteryContractSimple
 * @notice RWA 协议彩票系统 - 支持周/月/实时/年度奖池
 * @dev 实时奖每5分钟开奖，年度奖每年开奖；奖池 5% 转入国库地址，95% 分配给中奖用户
 * @dev 使用伪随机数（生产环境建议 Chainlink VRF）
 */
contract LotteryContractSimple is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ 类型定义 ============
    
    enum PoolType { Weekly, Monthly, RealTime, Annual }
    
    struct Ticket {
        address owner;           // 持有者地址
        uint256 number;          // 6位票号 (100000-999999)
        PoolType poolType;       // 奖池类型
        uint256 round;           // 期数
        uint256 purchaseTime;    // 购买时间
        bool isWinner;           // 是否中奖
        uint8 prizeLevel;        // 奖项等级 (1-4, 0=未中奖)
        uint256 prizeAmount;     // 奖金金额
        bool claimed;            // 是否已领取
    }
    
    struct Draw {
        uint256 winningNumber;   // 中奖号码
        uint256 drawTime;        // 开奖时间
        uint256 totalPrize;      // 总奖池金额
        uint256[4] winnersCount; // 各等级中奖数量
        uint256[4] prizePerWinner; // 各等级单注奖金
        bool completed;          // 是否已完成
    }
    
    // ============ 状态变量 ============
    
    // RWA 代币合约
    IERC20 public immutable rwaToken;
    
    // 彩票配置
    uint256 public constant WEEKLY_TICKET_PRICE = 10 * 10**18;   // 10 RWA
    uint256 public constant MONTHLY_TICKET_PRICE = 50 * 10**18;  // 50 RWA
    uint256 public constant REALTIME_TICKET_PRICE = 2 * 10**18;  // 2 RWA，每5分钟开奖
    uint256 public constant ANNUAL_TICKET_PRICE = 200 * 10**18;  // 200 RWA，年度奖
    uint256 public constant MIN_TICKET_NUMBER = 100000;
    uint256 public constant MAX_TICKET_NUMBER = 999999;
    
    // 奖金分配：5% 转入国库，95% 分给用户（一等奖48%、二等奖24%、三等奖14%、四等奖9%）
    uint256 public constant PROJECT_SHARE_PERCENT = 5;
    /// @notice 国库地址，接收每期 5% 运营份额
    address public treasury;
    uint8[4] public prizePercentages = [48, 24, 14, 9];
    
    // 开奖时间基于链上时间（UTC，即 block.timestamp）：实时=每5分钟整点；周=每周一0:00 UTC；月=每月1日0:00 UTC；年度=每年1月1日0:00 UTC
    uint256 public constant REALTIME_DRAW_INTERVAL = 5 minutes;
    
    // 当前期数
    uint256 public weeklyRound = 1;
    uint256 public monthlyRound = 1;
    uint256 public realTimeRound = 1;
    uint256 public annualRound = 1;
    
    // 下次开奖时间
    uint256 public nextWeeklyDraw;
    uint256 public nextMonthlyDraw;
    uint256 public nextRealTimeDraw;
    uint256 public nextAnnualDraw;
    
    // 奖池金额
    uint256 public weeklyPrizePool;
    uint256 public monthlyPrizePool;
    uint256 public realTimePrizePool;
    uint256 public annualPrizePool;
    
    // 存储结构
    mapping(uint256 => Ticket) public tickets;           // ticketId => Ticket
    mapping(uint256 => Draw) public weeklyDraws;         // round => Draw
    mapping(uint256 => Draw) public monthlyDraws;       // round => Draw
    mapping(uint256 => Draw) public realTimeDraws;       // round => Draw
    mapping(uint256 => Draw) public annualDraws;         // round => Draw
    mapping(address => uint256[]) public userTickets;    // user => ticketIds
    mapping(PoolType => mapping(uint256 => uint256[])) public roundTickets; // poolType => round => ticketIds
    
    uint256 public nextTicketId = 1;
    uint256 private nonce = 0;
    
    // ============ 事件 ============
    
    event TicketsPurchased(
        address indexed buyer,
        uint256[] ticketIds,
        uint256[] ticketNumbers,
        PoolType poolType,
        uint256 round,
        uint256 totalCost
    );
    
    event DrawCompleted(
        PoolType poolType,
        uint256 round,
        uint256 winningNumber,
        uint256 totalPrize,
        uint256 timestamp
    );
    
    event PrizeClaimed(
        address indexed winner,
        uint256 ticketId,
        uint8 prizeLevel,
        uint256 prizeAmount
    );
    
    // ============ 构造函数 ============
    
    constructor(address _rwaToken, address _treasury) Ownable(msg.sender) {
        require(_rwaToken != address(0), "Invalid RWA token address");
        rwaToken = IERC20(_rwaToken);
        treasury = _treasury != address(0) ? _treasury : msg.sender;
        
        nextRealTimeDraw = _nextFiveMinUTC(block.timestamp);
        nextWeeklyDraw = _nextMondayUTC(block.timestamp);
        nextMonthlyDraw = _nextMonthFirstUTC(block.timestamp);
        nextAnnualDraw = _nextJan1UTC(block.timestamp);
    }
    
    /// @dev UTC 下一个 5 分钟整点（0:00、0:05、0:10…）
    function _nextFiveMinUTC(uint256 ts) private pure returns (uint256) {
        return (ts / REALTIME_DRAW_INTERVAL + 1) * REALTIME_DRAW_INTERVAL;
    }
    
    /// @dev 下周一 00:00 UTC（epoch day 0=Thu，(day+4)%7：4=Mon）
    function _nextMondayUTC(uint256 ts) private pure returns (uint256) {
        uint256 day = ts / 1 days;
        uint256 wday = (day + 4) % 7; // 0=Thu, 1=Fri, 2=Sat, 3=Sun, 4=Mon
        uint256 daysToMon = (wday == 4) ? 0 : (11 - wday) % 7;
        if (daysToMon == 0) {
            uint256 thisMon = day * 1 days;
            if (ts <= thisMon) return thisMon;
            daysToMon = 7;
        }
        return (day + daysToMon) * 1 days;
    }
    
    /// @dev 1970 年起第 y 年 1 月 1 日的天数（0 起算）
    function _jan1Days(uint256 y) private pure returns (uint256) {
        return (y - 1970) * 365 + (y - 1969) / 4 - (y - 1969) / 100 + (y - 1969) / 400;
    }
    
    /// @dev 下月 1 日 00:00 UTC（每月 1 号 0 点）
    function _nextMonthFirstUTC(uint256 ts) private pure returns (uint256) {
        uint256 day = ts / 1 days;
        uint256 y = 1970 + day / 365;
        while (_jan1Days(y) > day) y--;
        while (_jan1Days(y + 1) <= day) y++;
        uint256 dJan1 = _jan1Days(y);
        uint256 dayInYear = day - dJan1;
        // 每月1号在当年中的天数偏移（非闰年）：Jan=0, Feb=31, Mar=59, ..., Dec=334
        if (dayInYear < 31) return (dJan1 + 31) * 1 days;   // Feb 1
        if (dayInYear < 59) return (dJan1 + 59) * 1 days;
        if (dayInYear < 90) return (dJan1 + 90) * 1 days;
        if (dayInYear < 120) return (dJan1 + 120) * 1 days;
        if (dayInYear < 151) return (dJan1 + 151) * 1 days;
        if (dayInYear < 181) return (dJan1 + 181) * 1 days;
        if (dayInYear < 212) return (dJan1 + 212) * 1 days;
        if (dayInYear < 243) return (dJan1 + 243) * 1 days;
        if (dayInYear < 273) return (dJan1 + 273) * 1 days;
        if (dayInYear < 304) return (dJan1 + 304) * 1 days;
        if (dayInYear < 334) return (dJan1 + 334) * 1 days;
        return _jan1Days(y + 1) * 1 days; // next year Jan 1
    }
    
    /// @dev 明年 1 月 1 日 00:00 UTC
    function _nextJan1UTC(uint256 ts) private pure returns (uint256) {
        uint256 day = ts / 1 days;
        uint256 y = 1970 + day / 365;
        while (_jan1Days(y) > day) y--;
        while (_jan1Days(y) <= day) y++;
        return _jan1Days(y) * 1 days;
    }
    
    // ============ 购买彩票 ============
    
    /**
     * @notice 购买彩票
     * @param count 购买数量
     * @param poolType 奖池类型
     */
    function buyTickets(uint256 count, PoolType poolType) external nonReentrant {
        require(count > 0 && count <= 100, "Invalid ticket count");
        
        uint256 currentRound;
        uint256 ticketPrice;
        if (poolType == PoolType.Weekly) {
            currentRound = weeklyRound;
            ticketPrice = WEEKLY_TICKET_PRICE;
        } else if (poolType == PoolType.Monthly) {
            currentRound = monthlyRound;
            ticketPrice = MONTHLY_TICKET_PRICE;
        } else if (poolType == PoolType.RealTime) {
            currentRound = realTimeRound;
            ticketPrice = REALTIME_TICKET_PRICE;
        } else {
            assert(poolType == PoolType.Annual);
            currentRound = annualRound;
            ticketPrice = ANNUAL_TICKET_PRICE;
        }
        uint256 totalCost = ticketPrice * count;
        
        rwaToken.safeTransferFrom(msg.sender, address(this), totalCost);
        
        if (poolType == PoolType.Weekly) {
            weeklyPrizePool += totalCost;
        } else if (poolType == PoolType.Monthly) {
            monthlyPrizePool += totalCost;
        } else if (poolType == PoolType.RealTime) {
            realTimePrizePool += totalCost;
        } else {
            annualPrizePool += totalCost;
        }
        
        // 生成彩票
        uint256[] memory ticketIds = new uint256[](count);
        uint256[] memory ticketNumbers = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 ticketId = nextTicketId++;
            uint256 ticketNumber = _generateTicketNumber();
            
            tickets[ticketId] = Ticket({
                owner: msg.sender,
                number: ticketNumber,
                poolType: poolType,
                round: currentRound,
                purchaseTime: block.timestamp,
                isWinner: false,
                prizeLevel: 0,
                prizeAmount: 0,
                claimed: false
            });
            
            ticketIds[i] = ticketId;
            ticketNumbers[i] = ticketNumber;
            userTickets[msg.sender].push(ticketId);
            roundTickets[poolType][currentRound].push(ticketId);
        }
        
        emit TicketsPurchased(msg.sender, ticketIds, ticketNumbers, poolType, currentRound, totalCost);
    }
    
    /**
     * @dev 生成唯一的6位彩票号码
     */
    function _generateTicketNumber() private returns (uint256) {
        nonce++;
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    nonce
                )
            )
        );
        return (random % (MAX_TICKET_NUMBER - MIN_TICKET_NUMBER + 1)) + MIN_TICKET_NUMBER;
    }
    
    // ============ 开奖流程 ============
    
    /**
     * @notice 开奖（仅管理员）。5% 奖池转项目方，95% 按等级分给中奖用户
     */
    function draw(PoolType poolType) external onlyOwner {
        uint256 nextDraw;
        uint256 currentRound;
        uint256 totalPrize;
        if (poolType == PoolType.Weekly) {
            nextDraw = nextWeeklyDraw;
            currentRound = weeklyRound;
            totalPrize = weeklyPrizePool;
        } else if (poolType == PoolType.Monthly) {
            nextDraw = nextMonthlyDraw;
            currentRound = monthlyRound;
            totalPrize = monthlyPrizePool;
        } else if (poolType == PoolType.RealTime) {
            nextDraw = nextRealTimeDraw;
            currentRound = realTimeRound;
            totalPrize = realTimePrizePool;
        } else {
            nextDraw = nextAnnualDraw;
            currentRound = annualRound;
            totalPrize = annualPrizePool;
        }
        require(block.timestamp >= nextDraw, "Too early to draw");
        
        uint256[] memory roundTicketIds = roundTickets[poolType][currentRound];
        
        if (roundTicketIds.length == 0) {
            if (poolType == PoolType.Weekly) {
                weeklyRound++;
                weeklyPrizePool = 0;
                nextWeeklyDraw = _nextMondayUTC(block.timestamp);
            } else if (poolType == PoolType.Monthly) {
                monthlyRound++;
                monthlyPrizePool = 0;
                nextMonthlyDraw = _nextMonthFirstUTC(block.timestamp);
            } else if (poolType == PoolType.RealTime) {
                realTimeRound++;
                realTimePrizePool = 0;
                nextRealTimeDraw = _nextFiveMinUTC(block.timestamp);
            } else {
                annualRound++;
                annualPrizePool = 0;
                nextAnnualDraw = _nextJan1UTC(block.timestamp);
            }
            emit DrawCompleted(poolType, currentRound, 0, 0, block.timestamp);
            return;
        }
        
        uint256 winningNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    block.number,
                    currentRound
                )
            )
        ) % (MAX_TICKET_NUMBER - MIN_TICKET_NUMBER + 1) + MIN_TICKET_NUMBER;
        
        // 5% 项目方运营费
        uint256 projectShare = (totalPrize * PROJECT_SHARE_PERCENT) / 100;
        uint256 forWinners = totalPrize - projectShare;
        if (projectShare > 0 && treasury != address(0)) {
            rwaToken.safeTransfer(treasury, projectShare);
        }
        
        uint256[4] memory winnersCount;
        uint256[4] memory prizePerWinner;
        
        for (uint256 i = 0; i < roundTicketIds.length; i++) {
            Ticket storage ticket = tickets[roundTicketIds[i]];
            uint8 level = _checkPrizeLevel(ticket.number, winningNumber);
            if (level > 0) {
                ticket.isWinner = true;
                ticket.prizeLevel = level;
                winnersCount[level - 1]++;
            }
        }
        
        // 仅对有人中奖的等级分配该等级比例；无人中的等级份额不分配
        for (uint8 i = 0; i < 4; i++) {
            if (winnersCount[i] > 0) {
                prizePerWinner[i] = (forWinners * prizePercentages[i]) / (100 * winnersCount[i]);
            }
        }
        
        for (uint256 i = 0; i < roundTicketIds.length; i++) {
            Ticket storage ticket = tickets[roundTicketIds[i]];
            if (ticket.isWinner) {
                ticket.prizeAmount = prizePerWinner[ticket.prizeLevel - 1];
            }
        }
        
        // 无人中奖的等级（如无人中一等奖）对应的份额：自动累计到下一期奖池
        uint256 totalAssigned = 0;
        for (uint8 i = 0; i < 4; i++) {
            totalAssigned += prizePerWinner[i] * winnersCount[i];
        }
        uint256 rollover = forWinners > totalAssigned ? forWinners - totalAssigned : 0;
        
        Draw storage drawRecord;
        if (poolType == PoolType.Weekly) drawRecord = weeklyDraws[currentRound];
        else if (poolType == PoolType.Monthly) drawRecord = monthlyDraws[currentRound];
        else if (poolType == PoolType.RealTime) drawRecord = realTimeDraws[currentRound];
        else drawRecord = annualDraws[currentRound];
        
        drawRecord.winningNumber = winningNumber;
        drawRecord.drawTime = block.timestamp;
        drawRecord.totalPrize = totalPrize;
        drawRecord.winnersCount = winnersCount;
        drawRecord.prizePerWinner = prizePerWinner;
        drawRecord.completed = true;
        
        if (poolType == PoolType.Weekly) {
            weeklyRound++;
            weeklyPrizePool = rollover;
            nextWeeklyDraw = _nextMondayUTC(block.timestamp);
        } else if (poolType == PoolType.Monthly) {
            monthlyRound++;
            monthlyPrizePool = rollover;
            nextMonthlyDraw = _nextMonthFirstUTC(block.timestamp);
        } else if (poolType == PoolType.RealTime) {
            realTimeRound++;
            realTimePrizePool = rollover;
            nextRealTimeDraw = _nextFiveMinUTC(block.timestamp);
        } else {
            annualRound++;
            annualPrizePool = rollover;
            nextAnnualDraw = _nextJan1UTC(block.timestamp);
        }
        
        emit DrawCompleted(poolType, currentRound, winningNumber, totalPrize, block.timestamp);
    }
    
    /**
     * @dev 检查中奖等级
     * @param ticketNumber 彩票号码
     * @param winningNumber 中奖号码
     * @return 等级 (1-4, 0=未中奖)
     */
    function _checkPrizeLevel(uint256 ticketNumber, uint256 winningNumber) private pure returns (uint8) {
        if (ticketNumber == winningNumber) return 1; // 完全匹配
        
        // 后5位匹配
        if (ticketNumber % 100000 == winningNumber % 100000) return 2;
        
        // 后4位匹配
        if (ticketNumber % 10000 == winningNumber % 10000) return 3;
        
        // 后3位匹配
        if (ticketNumber % 1000 == winningNumber % 1000) return 4;
        
        return 0;
    }
    
    // ============ 领取奖金 ============
    
    /**
     * @notice 领取奖金
     * @param ticketId 彩票ID
     */
    function claimPrize(uint256 ticketId) external nonReentrant {
        Ticket storage ticket = tickets[ticketId];
        require(ticket.owner == msg.sender, "Not ticket owner");
        require(ticket.isWinner, "Not a winner");
        require(!ticket.claimed, "Already claimed");
        require(ticket.prizeAmount > 0, "No prize");
        
        ticket.claimed = true;
        rwaToken.safeTransfer(msg.sender, ticket.prizeAmount);
        
        emit PrizeClaimed(msg.sender, ticketId, ticket.prizeLevel, ticket.prizeAmount);
    }
    
    /**
     * @notice 设置国库地址（仅 owner）
     * @param _treasury 新国库地址，接收每期 5% 份额
     */
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 获取用户的所有彩票
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @notice 获取彩票信息
     */
    function getTicket(uint256 ticketId) external view returns (Ticket memory) {
        return tickets[ticketId];
    }
    
    /**
     * @notice 获取开奖记录
     */
    function getDraw(PoolType poolType, uint256 round) external view returns (Draw memory) {
        if (poolType == PoolType.Weekly) return weeklyDraws[round];
        if (poolType == PoolType.Monthly) return monthlyDraws[round];
        if (poolType == PoolType.RealTime) return realTimeDraws[round];
        return annualDraws[round];
    }
    
    /**
     * @notice 获取当前奖池金额
     */
    function getPrizePool(PoolType poolType) external view returns (uint256) {
        if (poolType == PoolType.Weekly) return weeklyPrizePool;
        if (poolType == PoolType.Monthly) return monthlyPrizePool;
        if (poolType == PoolType.RealTime) return realTimePrizePool;
        return annualPrizePool;
    }
    
    /**
     * @notice 获取当前奖池信息（供前端统一展示）
     * @param poolType 0=Weekly, 1=Monthly, 2=RealTime, 3=Annual
     */
    function getCurrentPoolInfo(uint8 poolType) external view returns (
        uint256 currentRound,
        uint256 prizePool,
        uint256 nextDrawTime,
        uint256 ticketsSold,
        uint256 ticketPrice
    ) {
        PoolType pt = PoolType(poolType);
        if (pt == PoolType.Weekly) {
            currentRound = weeklyRound;
            prizePool = weeklyPrizePool;
            nextDrawTime = nextWeeklyDraw;
            ticketPrice = WEEKLY_TICKET_PRICE;
        } else if (pt == PoolType.Monthly) {
            currentRound = monthlyRound;
            prizePool = monthlyPrizePool;
            nextDrawTime = nextMonthlyDraw;
            ticketPrice = MONTHLY_TICKET_PRICE;
        } else if (pt == PoolType.RealTime) {
            currentRound = realTimeRound;
            prizePool = realTimePrizePool;
            nextDrawTime = nextRealTimeDraw;
            ticketPrice = REALTIME_TICKET_PRICE;
        } else {
            currentRound = annualRound;
            prizePool = annualPrizePool;
            nextDrawTime = nextAnnualDraw;
            ticketPrice = ANNUAL_TICKET_PRICE;
        }
        ticketsSold = roundTickets[pt][currentRound].length;
    }
}
