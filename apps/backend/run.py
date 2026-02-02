"""
Application Entry Point

Run the Flask application with SocketIO support.
"""

import os
from app import create_app
from app.extensions import socketio

# Create the application
app = create_app()

if __name__ == "__main__":
    # Get configuration from environment
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 8000))
    
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎹  Sargam AI - Music Tutor Backend                    ║
║                                                           ║
║   Running on: http://{host}:{port}                        ║
║   Debug mode: {debug}                                      ║
║                                                           ║
║   Endpoints:                                              ║
║   - REST API: http://{host}:{port}/api/v1                 ║
║   - WebSocket: ws://{host}:{port}/socket.io               ║
║   - Health: http://{host}:{port}/health                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Run with SocketIO
    socketio.run(
        app,
        debug=debug,
        host=host,
        port=port,
        allow_unsafe_werkzeug=True  # For development
    )
