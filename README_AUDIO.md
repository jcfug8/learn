# Audio File Splitting Script

This script splits a large audio file containing multiple words into separate files based on silence detection.

## Installation

Install the required Python package:

```bash
pip install pydub
```

**Note:** For MP3 support, you may also need `ffmpeg`:
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
- Windows: Download from https://ffmpeg.org/download.html

## Usage

### Basic Usage

Split an audio file into numbered files:

```bash
python split_audio.py input.mp3 output_directory/
```

### With Word List

Automatically name files based on word list:

```bash
python split_audio.py input.mp3 output_directory/ --word-list word-lists/frys_first_100_words/
```

Or use a specific word list file:

```bash
python split_audio.py input.mp3 output_directory/ --word-list word-lists/frys_first_100_words/words.json
```

### Adjusting Silence Detection

If the script isn't splitting correctly, adjust the silence detection parameters:

```bash
python split_audio.py input.mp3 output_directory/ \
  --min-silence-len 800 \
  --silence-thresh -35 \
  --keep-silence 150
```

### Adjusting MP3 Compression

Control the output file size with bitrate:

```bash
# Smaller files, lower quality (default)
python split_audio.py input.mp3 output_directory/ --bitrate 64k

# Higher quality, larger files
python split_audio.py input.mp3 output_directory/ --bitrate 128k
```

**Parameters:**
- `--min-silence-len`: Minimum length of silence to split on (milliseconds). Increase if words are being split too much.
- `--silence-thresh`: Silence threshold in dB (default: -40). Lower values = more sensitive to silence. Try -35 to -45.
- `--keep-silence`: Amount of silence to keep at start/end of each chunk (milliseconds). Prevents words from being cut off.
- `--bitrate`: MP3 compression bitrate (default: 64k). Options: 64k, 96k, 128k, 192k. Lower = smaller files but lower quality.

## Example

```bash
# Split Fry's First 100 Words audio file
python split_audio.py frys_words.mp3 audio/words/frys_first_100_words/ \
  --word-list word-lists/frys_first_100_words/

# Split Dolch Sight Words audio file
python split_audio.py dolch_words.mp3 audio/words/dolch_sight_words/ \
  --word-list word-lists/dolch_sight_words/

# Split letters audio file
python split_audio.py letters.mp3 audio/letters/ \
  --word-list letter-lists/
```

## Output

The script will create individual audio files named after each word (or numbered if no word list is provided). Files will be saved in the specified output directory with the same format as the input file.

