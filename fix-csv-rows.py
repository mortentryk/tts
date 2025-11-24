#!/usr/bin/env python3
"""
Fix CSV file so all rows are on single lines
Merges rows that are split across multiple lines in the original file
"""
import csv
import io

# Read original file
with open('the-voice-within.csv', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines
lines = content.split('\n')

# Reconstruct rows - merge split rows
reconstructed_lines = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # Check if this line is just an ID (possibly split row)
    if line:
        parts = line.split('\t')
        # If line has only one non-empty part that looks like an ID
        if len(parts) == 1 and parts[0] and (parts[0].isdigit() or len(parts[0]) <= 3):
            # Look ahead for continuation (skip empty lines)
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            
            # If we found a continuation line
            if j < len(lines) and lines[j].strip():
                next_line = lines[j].strip()
                # Check if next line looks like it's part of the same row (starts with quote or has tabs)
                if next_line.startswith('"') or '\t' in next_line:
                    # Merge them
                    merged = line + '\t' + next_line
                    reconstructed_lines.append(merged)
                    i = j + 1
                    continue
    
    # Not a split row, add as-is
    reconstructed_lines.append(lines[i])
    i += 1

# Convert back to string
reconstructed_content = '\n'.join(reconstructed_lines)

# Read with CSV reader
file_obj = io.StringIO(reconstructed_content)
reader = csv.reader(file_obj, delimiter='\t', quotechar='"')

rows = []
for row in reader:
    rows.append(row)

print(f'Rekonstrueret til {len(rows)} rækker')

# Find and show row 5
for i, row in enumerate(rows):
    if len(row) > 0 and row[0] == '5':
        print(f'\nRække 5 fundet:')
        print(f'  Antal kolonner: {len(row)}')
        if len(row) > 1:
            text_preview = row[1][:100] + '...' if len(row[1]) > 100 else row[1]
            print(f'  Text preview: {text_preview}')

# Write to Google Sheets format
output_file = 'the-voice-within_google-sheets.csv'
with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    for row in rows:
        # Ensure correct number of columns
        while len(row) < len(rows[0]):
            row.append('')
        if len(row) > len(rows[0]):
            row = row[:len(rows[0])]
        writer.writerow(row)

print(f'\n✅ Oprettet: {output_file}')

# Verify - count physical lines
with open(output_file, 'r', encoding='utf-8-sig') as f:
    file_lines = f.readlines()
    print(f'\nFysiske linjer i filen: {len(file_lines)}')
    print(f'Logiske CSV rækker: {len(rows)}')
    
    if len(file_lines) == len(rows):
        print('✅ Perfekt! Hver række er på én linje')
    else:
        print(f'⚠️  Forskelligt antal')

# Check row 5 specifically
print('\nTjekker række 5:')
with open(output_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=',', quotechar='"')
    gs_rows = list(reader)
    
    for i, row in enumerate(gs_rows):
        if len(row) > 0 and row[0] == '5':
            print(f'  Fundet på index {i}')
            print(f'  Antal kolonner: {len(row)}')
            if len(row) > 1 and row[1]:
                print(f'  Text længde: {len(row[1])} tegn')
                print(f'  ✅ Række 5 er nu komplet på én linje')

