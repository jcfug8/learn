#!/usr/bin/env python3
"""
Script to split a large audio file containing multiple words into separate files.
Splits on silence and names files based on a word list.
"""

import argparse
import os
import json
import subprocess
import numpy as np
import librosa
import soundfile as sf

def load_word_list(word_list_path=None):
    """Load words from word list JSON files or return None to use order from audio."""
    if not word_list_path:
        return None
    
    words = []
    
    # Try to load from word-lists directory
    if os.path.isdir(word_list_path):
        # Load all word lists
        index_path = os.path.join(word_list_path, 'index.json')
        if os.path.exists(index_path):
            with open(index_path, 'r') as f:
                index = json.load(f)
            
            for word_list_id in index.get('wordLists', []):
                words_json_path = os.path.join(word_list_path, word_list_id, 'words.json')
                if os.path.exists(words_json_path):
                    with open(words_json_path, 'r') as f:
                        word_list_data = json.load(f)
                    
                    # Extract words from sub-lists
                    for sub_list in word_list_data.get('subLists', []):
                        words.extend(sub_list.get('words', []))
        else:
            # Single word list directory
            words_json_path = os.path.join(word_list_path, 'words.json')
            if os.path.exists(words_json_path):
                with open(words_json_path, 'r') as f:
                    word_list_data = json.load(f)
                
                for sub_list in word_list_data.get('subLists', []):
                    words.extend(sub_list.get('words', []))
    elif os.path.isfile(word_list_path):
        # Single JSON file
        with open(word_list_path, 'r') as f:
            word_list_data = json.load(f)
        
        for sub_list in word_list_data.get('subLists', []):
            words.extend(sub_list.get('words', []))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_words = []
    for word in words:
        if word.lower() not in seen:
            seen.add(word.lower())
            unique_words.append(word)
    
    return unique_words if unique_words else None

def detect_silence(y, sr, min_silence_len=500, silence_thresh=-40):
    """
    Detect silence regions in audio.
    
    Args:
        y: Audio signal (numpy array)
        sr: Sample rate
        min_silence_len: Minimum silence length in milliseconds
        silence_thresh: Silence threshold in dB
    
    Returns:
        List of (start, end) tuples in samples
    """
    # Convert to dB
    rms = librosa.feature.rms(y=y)[0]
    db = librosa.power_to_db(rms**2, ref=np.max)
    
    # Find silent regions (below threshold)
    silent = db < silence_thresh
    
    # RMS frames are computed with hop_length=512 by default
    hop_length = 512
    # Convert min_silence_len from ms to frames
    min_silence_frames = int((min_silence_len / 1000) * sr / hop_length)
    
    # Find continuous silent regions
    silence_regions = []
    in_silence = False
    silence_start = 0
    
    for i, is_silent in enumerate(silent):
        if is_silent and not in_silence:
            # Start of silence
            in_silence = True
            silence_start = i
        elif not is_silent and in_silence:
            # End of silence
            in_silence = False
            silence_end = i
            # Check if silence is long enough (compare frames)
            if silence_end - silence_start >= min_silence_frames:
                # Convert frame indices to sample indices
                start_sample = silence_start * hop_length
                end_sample = silence_end * hop_length
                silence_regions.append((start_sample, end_sample))
    
    # Handle silence at the end
    if in_silence:
        # Check if remaining silence is long enough
        remaining_frames = len(silent) - silence_start
        if remaining_frames >= min_silence_frames:
            start_sample = silence_start * hop_length
            end_sample = len(y)
            silence_regions.append((start_sample, end_sample))
    
    return silence_regions

def has_audio_content(y, sr, min_energy_db=-40):
    """
    Check if an audio chunk has meaningful audio content.
    
    Args:
        y: Audio signal (numpy array)
        sr: Sample rate
        min_energy_db: Minimum energy level in dB (default: -40)
    
    Returns:
        True if audio has content above threshold, False otherwise
    """
    if len(y) == 0:
        return False
    
    # Calculate RMS energy
    rms = librosa.feature.rms(y=y)[0]
    if len(rms) == 0:
        return False
    
    # Get maximum RMS value
    max_rms = np.max(rms)
    
    # Convert to dB using absolute reference (1.0 = full scale)
    # This gives us an absolute measure, not relative to the chunk
    if max_rms <= 0:
        return False
    
    max_db = librosa.power_to_db(max_rms**2, ref=1.0)
    
    # Convert threshold from dB to RMS value for direct comparison
    # min_energy_db = 20 * log10(rms_threshold)
    # rms_threshold = 10^(min_energy_db / 20)
    rms_threshold = 10 ** (min_energy_db / 20)
    
    # Check if maximum RMS is above threshold
    # Also ensure it's not just noise (minimum 0.01 RMS = -40 dB)
    return max_rms > max(rms_threshold, 0.01)

def analyze_silence(input_file, silence_thresh=-40):
    """
    Analyze silence blocks in an audio file.
    
    Args:
        input_file: Path to input audio file
        silence_thresh: Silence threshold in dB
    
    Returns:
        Dictionary with silence statistics
    """
    print(f"Loading audio file: {input_file}")
    y, sr = librosa.load(input_file, sr=None)
    
    duration = len(y) / sr
    print(f"Audio duration: {duration:.2f} seconds")
    print(f"Sample rate: {sr} Hz")
    print(f"Analyzing silence (threshold: {silence_thresh} dB)...")
    
    # Detect all silence regions (no minimum length filter for analysis)
    # Convert to dB
    rms = librosa.feature.rms(y=y)[0]
    db = librosa.power_to_db(rms**2, ref=np.max)
    
    # Find silent regions (below threshold)
    silent = db < silence_thresh
    
    # Find continuous silent regions
    silence_regions = []
    in_silence = False
    silence_start = 0
    hop_length = 512
    
    for i, is_silent in enumerate(silent):
        if is_silent and not in_silence:
            # Start of silence
            in_silence = True
            silence_start = i
        elif not is_silent and in_silence:
            # End of silence
            in_silence = False
            silence_end = i
            # Convert frame indices to sample indices
            start_sample = silence_start * hop_length
            end_sample = silence_end * hop_length
            silence_regions.append((start_sample, end_sample))
    
    # Handle silence at the end
    if in_silence:
        start_sample = silence_start * hop_length
        end_sample = len(y)
        silence_regions.append((start_sample, end_sample))
    
    if not silence_regions:
        print("\nNo silence detected at this threshold.")
        return None
    
    # Calculate statistics
    silence_lengths = [(end - start) / sr for start, end in silence_regions]  # in seconds
    total_silence = sum(silence_lengths)
    avg_silence = np.mean(silence_lengths)
    min_silence = np.min(silence_lengths)
    max_silence = np.max(silence_lengths)
    silence_percentage = (total_silence / duration) * 100
    
    stats = {
        'count': len(silence_regions),
        'total_duration': total_silence,
        'average_length': avg_silence,
        'min_length': min_silence,
        'max_length': max_silence,
        'percentage': silence_percentage,
        'lengths': silence_lengths
    }
    
    print(f"\nSilence Analysis Results:")
    print(f"  Total silence blocks: {stats['count']}")
    print(f"  Average silence length: {stats['average_length']*1000:.1f} ms")
    print(f"  Minimum silence length: {stats['min_length']*1000:.1f} ms")
    print(f"  Maximum silence length: {stats['max_length']*1000:.1f} ms")
    print(f"  Total silence duration: {stats['total_duration']:.2f} seconds")
    print(f"  Silence percentage: {stats['percentage']:.1f}%")
    
    return stats

def split_audio_file(input_file, output_dir, word_list=None, min_silence_len=500, silence_thresh=-40, keep_silence=100, bitrate='64k', min_energy_db=-40):
    """
    Split an audio file on silence into separate files.
    
    Args:
        input_file: Path to input audio file
        output_dir: Directory to save output files
        word_list: List of words in order (optional, will use numbered files if not provided)
        min_silence_len: Minimum length of silence to split on (ms)
        silence_thresh: Silence threshold in dB
        keep_silence: Amount of silence to keep at beginning/end of each chunk (ms)
        bitrate: MP3 bitrate for compression (default: '64k', options: '64k', '96k', '128k', '192k')
        min_energy_db: Minimum energy level in dB for a chunk to be considered valid (default: -40)
    """
    print(f"Loading audio file: {input_file}")
    y, sr = librosa.load(input_file, sr=None)
    
    duration = len(y) / sr
    print(f"Audio duration: {duration:.2f} seconds")
    print(f"Sample rate: {sr} Hz")
    print(f"Detecting silence and splitting...")
    
    # Detect silence regions
    silence_regions = detect_silence(y, sr, min_silence_len, silence_thresh)
    print(f"Found {len(silence_regions)} silence regions (min length: {min_silence_len}ms)")
    
    # Split audio at silence regions
    chunks = []
    keep_silence_samples = int(keep_silence * sr / 1000)
    
    start = 0
    for silence_start, silence_end in silence_regions:
        # Extract chunk from previous end to this silence start
        chunk_start = max(0, start - keep_silence_samples)
        chunk_end = min(len(y), silence_start + keep_silence_samples)
        
        if chunk_end > chunk_start:
            chunks.append((chunk_start, chunk_end))
        
        start = silence_end
    
    # Add final chunk
    if start < len(y):
        chunk_start = max(0, start - keep_silence_samples)
        chunk_end = len(y)
        if chunk_end > chunk_start:
            chunks.append((chunk_start, chunk_end))
    
    # If no silence detected, treat entire file as one chunk
    if not chunks:
        chunks = [(0, len(y))]
    
    print(f"Found {len(chunks)} audio chunks")
    
    if not chunks:
        print("No chunks found! Try adjusting silence_thresh or min_silence_len")
        return
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Always use MP3 format for output (compressed)
    ext = '.mp3'
    
    # Save each chunk as MP3 using ffmpeg
    saved_count = 0
    for i, (chunk_start, chunk_end) in enumerate(chunks):
        # Extract chunk
        chunk_audio = y[chunk_start:chunk_end]
        
        # Verify chunk has audio content
        if not has_audio_content(chunk_audio, sr, min_energy_db):
            chunk_duration = (chunk_end - chunk_start) / sr
            # Calculate actual energy for debugging
            rms = librosa.feature.rms(y=chunk_audio)[0]
            max_rms = np.max(rms) if len(rms) > 0 else 0
            max_db = librosa.power_to_db(max_rms**2, ref=1.0) if max_rms > 0 else -np.inf
            print(f"Skipping chunk {i+1} (no audio content: {max_db:.1f} dB, {chunk_duration:.2f}s)")
            continue
        
        if word_list and saved_count < len(word_list):
            # Use word from list as filename
            word = word_list[saved_count]
            # Sanitize filename (remove special characters)
            safe_word = "".join(c for c in word if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_word = safe_word.replace(' ', '_')
            filename = f"{safe_word}{ext}"
        else:
            # Use numbered filename
            filename = f"word_{saved_count+1:03d}{ext}"
        
        output_path = os.path.join(output_dir, filename)
        
        # Save as temporary WAV file
        temp_wav = output_path.replace('.mp3', '_temp.wav')
        sf.write(temp_wav, chunk_audio, sr)
        
        # Convert to MP3 using ffmpeg
        try:
            subprocess.run(
                ['ffmpeg', '-i', temp_wav, '-codec:a', 'libmp3lame', '-b:a', bitrate, '-y', output_path],
                check=True,
                capture_output=True
            )
            # Remove temporary WAV file
            os.remove(temp_wav)
        except subprocess.CalledProcessError as e:
            print(f"Error converting {filename} to MP3: {e}")
            # Keep the WAV file if MP3 conversion fails
            os.rename(temp_wav, output_path.replace('.mp3', '.wav'))
            continue
        
        # Get file size for reporting
        file_size = os.path.getsize(output_path) / 1024  # Size in KB
        chunk_duration = (chunk_end - chunk_start) / sr
        print(f"Saved: {filename} ({chunk_duration:.2f}s, {file_size:.1f} KB)")
        saved_count += 1
    
    print(f"\nDone! Saved {saved_count} files to {output_dir} (skipped {len(chunks) - saved_count} silent chunks)")

def main():
    parser = argparse.ArgumentParser(
        description='Split an audio file containing multiple words into separate files based on silence detection.'
    )
    parser.add_argument('input_file', help='Input audio file path')
    parser.add_argument('output_dir', nargs='?', help='Output directory for split files (required unless --analyze)')
    parser.add_argument('--analyze', '-a', action='store_true',
                       help='Analyze silence blocks instead of splitting (no output_dir needed)')
    parser.add_argument('--word-list', '-w', 
                       help='Path to word list JSON file or word-lists directory (optional)')
    parser.add_argument('--min-silence-len', type=int, default=500,
                       help='Minimum silence length in milliseconds (default: 500)')
    parser.add_argument('--silence-thresh', type=int, default=-40,
                       help='Silence threshold in dB (default: -40, lower = more sensitive)')
    parser.add_argument('--keep-silence', type=int, default=100,
                       help='Amount of silence to keep at start/end of chunks in ms (default: 100)')
    parser.add_argument('--bitrate', default='64k',
                       choices=['64k', '96k', '128k', '192k'],
                       help='MP3 bitrate for compression (default: 64k, lower = smaller files)')
    parser.add_argument('--min-energy-db', type=float, default=-40,
                       help='Minimum energy level in dB for a chunk to be saved (default: -40, lower = more permissive)')
    
    args = parser.parse_args()
    
    # If analyze mode, just analyze and exit
    if args.analyze:
        analyze_silence(args.input_file, args.silence_thresh)
        return
    
    # Otherwise, split the file
    if not args.output_dir:
        parser.error("output_dir is required unless --analyze is used")
    
    # Load word list if provided
    word_list = None
    if args.word_list:
        print(f"Loading word list from: {args.word_list}")
        word_list = load_word_list(args.word_list)
        if word_list:
            print(f"Loaded {len(word_list)} words")
        else:
            print("Warning: Could not load word list, will use numbered filenames")
    
    # Split the audio file
    split_audio_file(
        args.input_file,
        args.output_dir,
        word_list=word_list,
        min_silence_len=args.min_silence_len,
        silence_thresh=args.silence_thresh,
        keep_silence=args.keep_silence,
        bitrate=args.bitrate,
        min_energy_db=args.min_energy_db
    )

if __name__ == '__main__':
    main()
