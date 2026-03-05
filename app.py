from flask import Flask, render_template

# -----------------------------------------------------------------------------
# AudioViz Flask Application
# -----------------------------------------------------------------------------
# This backend intentionally stays minimal for the MVP:
# - Serves a single HTML page
# - All voice recognition and visual updates run client-side in JavaScript
# - No persistent storage or API endpoints are required at this stage
app = Flask(__name__)


@app.route("/")
def index():
    """Render the main AudioViz interface.

    Returns:
        str: Rendered HTML for the voice-controlled shape playground.
    """
    return render_template("index.html")


if __name__ == "__main__":
    # Local-only development server configuration.
    # Do not use debug=True in production deployments.
    app.run(debug=True)
