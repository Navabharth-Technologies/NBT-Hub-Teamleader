import os

with open(r'c:\Users\NBT\Desktop\tl\teamleader\src\components\profile\ProfileScreen.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Braces: {content.count('{')} / {content.count('}')}")
print(f"Parens: {content.count('(')} / {content.count(')')}")
print(f"Single Quotes: {content.count(\"'\")}")
print(f"Double Quotes: {content.count('\"')}")
print(f"Backticks: {content.count('`')}")
