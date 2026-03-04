# AudioViz

Simple MVP Python web app that listens to voice commands and updates a shape (color, type, size, position) in real time.

## Tech

- Python + Flask (server)
- Web Speech API (free browser speech recognition)
- Vanilla HTML/CSS/JS (frontend)

## Run locally

1. Create and activate a Python virtual environment
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the app:

   ```bash
   python app.py
   ```

4. Open:

   ```
   http://127.0.0.1:5000
   ```

Use Chrome or Edge for best Web Speech API support.

## Voice commands

- Shapes: `circle`, `square`
- Colors: `red`, `blue`, `green`, `yellow`, `purple`
- Movement: `move left`, `move right`, `move up`, `move down`
- Size: `bigger`, `smaller`
- Utility: `reset`, `start listening`, `stop listening`
