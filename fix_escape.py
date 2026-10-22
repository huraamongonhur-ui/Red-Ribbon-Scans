with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: change (c) to [c] in the escape function
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'const esc=' in line and 'replace' in line:
        # Replace the object call (c) with property access [c]
        lines[i] = "const esc=s=>String(s).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":\"&#39;\"}[c]));"
        break

content = '\n'.join(lines)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed:', lines[i])