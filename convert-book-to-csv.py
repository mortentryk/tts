#!/usr/bin/env python3
"""
Convert a book text file to CSV format with Continue buttons
"""
import csv
import re
import sys

def clean_text(text):
    """Clean text to single line: remove line breaks, quotes, extra spaces, indentation"""
    # Replace all line breaks with spaces
    text = text.replace('\n', ' ').replace('\r', ' ')
    # Remove quotation marks
    text = text.replace('"', '').replace("'", '')
    # Remove multiple spaces and replace with single space
    text = re.sub(r'\s+', ' ', text)
    # Strip leading/trailing spaces
    text = text.strip()
    return text

def split_into_segments(text, min_chars=600, max_chars=1200, min_paragraphs=2):
    """
    Split text into longer segments by combining paragraphs.
    
    Args:
        min_chars: Minimum characters per segment (target)
        max_chars: Maximum characters per segment (hard limit)
        min_paragraphs: Minimum number of paragraphs to combine
    """
    segments = []
    
    # Split by chapter markers (like "Kapital 1", "Chapter", etc.)
    chapter_pattern = r'(?i)(?:^|\n\n)(Kapital\s+\d+|Kapitel\s+\d+|Chapter\s+\d+)'
    chapters = re.split(chapter_pattern, text)
    
    all_paragraphs = []
    
    if len(chapters) > 1:
        # We found chapters - process each chapter separately
        for i in range(1, len(chapters), 2):
            if i + 1 < len(chapters):
                chapter_title = chapters[i].strip()
                chapter_content = chapters[i + 1].strip()
                # Split chapter content into paragraphs
                paragraphs = re.split(r'\n\n+', chapter_content)
                for para in paragraphs:
                    para = para.strip()
                    if para and len(para) > 10:  # Filter out very short segments
                        all_paragraphs.append(para)
    else:
        # No chapters found, split by double newlines (paragraphs)
        paragraphs = re.split(r'\n\n+', text)
        for para in paragraphs:
            para = para.strip()
            # Skip very short lines and empty paragraphs
            if para and len(para) > 20:
                all_paragraphs.append(para)
    
    # Now combine paragraphs into longer segments
    current_segment = []
    current_length = 0
    
    for i, para in enumerate(all_paragraphs):
        para_length = len(para)
        estimated_new_length = current_length + para_length + (2 if current_segment else 0)
        
        # If adding this paragraph would exceed max_chars and we have enough content, finalize segment
        if (estimated_new_length > max_chars and 
            current_length >= min_chars and 
            len(current_segment) >= min_paragraphs):
            # Combine current paragraphs into one segment
            segments.append('\n\n'.join(current_segment))
            current_segment = [para]
            current_length = para_length
        else:
            # Add paragraph to current segment
            current_segment.append(para)
            current_length = estimated_new_length
            
            # If we've reached a good length (near target) and have minimum paragraphs, 
            # check if next paragraph would push us over max - if so, finalize now
            if (current_length >= min_chars and 
                len(current_segment) >= min_paragraphs):
                # Check next paragraph if available
                if i + 1 < len(all_paragraphs):
                    next_para_length = len(all_paragraphs[i + 1])
                    if current_length + next_para_length + 2 > max_chars:
                        # Next paragraph would push us over, finalize now
                        segments.append('\n\n'.join(current_segment))
                        current_segment = []
                        current_length = 0
                elif current_length >= min_chars:
                    # Last paragraph and we have enough content
                    segments.append('\n\n'.join(current_segment))
                    current_segment = []
                    current_length = 0
    
    # Add any remaining paragraphs as final segment
    if current_segment:
        segments.append('\n\n'.join(current_segment))
    
    return segments

def convert_book_to_csv(input_file, output_file, story_title=None, story_description=None, continue_text="Fortsæt"):
    """Convert book text file to CSV format with Continue buttons"""
    
    # Read the book file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into segments (combining paragraphs for longer reading experience)
    segments = split_into_segments(content, min_chars=600, max_chars=1200, min_paragraphs=2)
    
    # Calculate statistics
    segment_lengths = [len(s) for s in segments]
    avg_length = sum(segment_lengths) // len(segments) if segments else 0
    
    print(f"Found {len(segments)} segments")
    print(f"  Average length: {avg_length} characters")
    print(f"  Min length: {min(segment_lengths)} characters")
    print(f"  Max length: {max(segment_lengths)} characters")
    print(f"  Segments 600-1200 chars: {sum(1 for l in segment_lengths if 600 <= l <= 1200)}")
    
    # Create CSV with headers
    headers = [
        'id', 'text', 'valg1_label', 'valg1_goto', 'valg2_label', 'valg2_goto', 
        'valg3_label', 'valg3_goto', 'check_stat', 'check_dc', 'check_success', 
        'check_fail', 'image', 'front_screen_image', 'story_title', 'story_description', 
        'length', 'age'
    ]
    
    # Write CSV
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        
        # Write header row
        writer.writerow(headers)
        
        # Write metadata in first data row (optional)
        if story_title or story_description:
            metadata_row = ['1']  # id
            metadata_row.append('')  # text (empty for metadata row)
            metadata_row.extend([''] * 12)  # empty choice/check columns
            metadata_row.append(story_title or '')  # story_title
            metadata_row.append(story_description or '')  # story_description
            metadata_row.extend(['', ''])  # length, age
            writer.writerow(metadata_row)
            start_id = 2
        else:
            start_id = 1
        
        # Write story segments with Continue buttons
        for i, segment in enumerate(segments, start=start_id):
            row = [str(i)]  # id
            # Clean text to single line
            cleaned_text = clean_text(segment)
            row.append(cleaned_text)  # text
            
            # Add Continue button pointing to next segment (except for last segment)
            if i < len(segments) + start_id - 1:
                row.append(continue_text)  # valg1_label
                row.append(str(i + 1))  # valg1_goto (next segment)
            else:
                row.append('')  # valg1_label (empty for last segment)
                row.append('')  # valg1_goto
            
            # Empty columns for valg2, valg3, checks, images
            row.extend([''] * 14)  # valg2_label, valg2_goto, valg3_label, valg3_goto, check_stat, check_dc, check_success, check_fail, image, front_screen_image, story_title, story_description, length, age
            writer.writerow(row)
    
    print(f"✅ Created CSV file: {output_file}")
    print(f"   Total rows: {len(segments) + (1 if story_title or story_description else 0)}")
    print(f"   Each segment has a '{continue_text}' button linking to the next segment")

if __name__ == "__main__":
    input_file = "/Users/christianhjorth/Downloads/Jutenheim && rettet 29 nov.txt"
    output_file = "jutenheim.csv"
    
    # Optional: Add story metadata
    story_title = "Jutenheim"
    story_description = "En historie om Skrymir og hans rejse gennem Jotunheim"
    continue_text = "Fortsæt"  # Change to "Continue" for English
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    if len(sys.argv) > 3:
        continue_text = sys.argv[3]
    
    convert_book_to_csv(input_file, output_file, story_title, story_description, continue_text)

