#!/usr/bin/env python3
"""
Script til at se og arbejde med CSV kolonner
"""
import csv
import sys

def view_csv_columns(filename, max_rows=5, max_col_width=50):
    """Vis CSV filens kolonner i et læsbart format"""
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t', quotechar='"')
        rows = list(reader)
    
    if not rows:
        print("Filen er tom")
        return
    
    # Vis header
    print("=" * 80)
    print(f"CSV Fil: {filename}")
    print(f"Antal rækker: {len(rows)}")
    print(f"Antal kolonner: {len(rows[0])}")
    print("=" * 80)
    print()
    
    # Vis kolonne navne
    print("KOLONNER:")
    for i, col in enumerate(rows[0], 1):
        print(f"  {i:2d}. {col}")
    print()
    
    # Vis eksempel data
    print(f"EKSEMPEL DATA (første {min(max_rows, len(rows)-1)} rækker):")
    print("-" * 80)
    
    for row_idx in range(1, min(max_rows + 1, len(rows))):
        print(f"\nRække {row_idx} (id: {rows[row_idx][0] if len(rows[row_idx]) > 0 else 'N/A'}):")
        for col_idx, col_name in enumerate(rows[0]):
            if col_idx < len(rows[row_idx]):
                value = rows[row_idx][col_idx]
                # Truncate long values
                if len(value) > max_col_width:
                    display_value = value[:max_col_width] + "..."
                else:
                    display_value = value
                print(f"  {col_name}: {display_value}")
        print("-" * 80)

def export_to_excel_format(filename, output_filename=None):
    """Eksporter CSV til Excel-kompatibel format (med komma som delimiter)"""
    if output_filename is None:
        output_filename = filename.replace('.csv', '_excel.csv')
    
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t', quotechar='"')
        rows = list(reader)
    
    # Write with comma delimiter (Excel standard)
    with open(output_filename, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for row in rows:
            writer.writerow(row)
    
    print(f"Eksporteret til Excel-format: {output_filename}")
    print("Denne fil kan åbnes direkte i Excel eller Google Sheets")

if __name__ == "__main__":
    filename = "the-voice-within.csv"
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "export":
            export_to_excel_format(filename)
        else:
            filename = sys.argv[1]
            view_csv_columns(filename)
    else:
        view_csv_columns(filename)
        print("\n" + "=" * 80)
        print("TIP: Kør 'python3 view-csv-columns.py export' for at eksportere til Excel-format")
        print("=" * 80)

