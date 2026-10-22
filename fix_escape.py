with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escape function - correct single quote key
amp = '&' + 'amp;'
lt = '&' + 'lt;'
gt = '&' + 'gt;'
quot = '&' + 'quot;'
apos = '&#' + '39;'

new_line = "const esc=s=>String(s).replace(/[&<>'\"]/g,c=>({'&':'" + amp + "','<':'" + lt + "','>':'" + gt + "','\"':'" + quot + "','\\'':'" + apos + "'}(c));"

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'const esc=' in line and 'replace' in line:
        lines[i] = new_line
        break

content = '\n'.join(lines)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed:', new_line)