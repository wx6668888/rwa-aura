import re

with open('i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove non-ASCII characters before quotes
content = re.sub(r'[^\x00-\x7F]+(?=[\'"])', '', content)

with open('i18n.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed all non-ASCII characters')
