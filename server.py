import json
import subprocess
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)
# 1. Enable CORS for all routes (allows your JS to connect)
CORS(app)

# 2. Path to your compiled C++ executable
#    (Update this path!)
CPP_EXECUTABLE_PATH = "./build/tukey_compute.exe" 
# or on Linux/macOS: "./build/tukey_compute"

@app.route('/compute', methods=['POST'])
def compute_tukey_contour():
    # 3. Get the JSON data sent from three.js
    input_data = request.get_json()
    if not input_data:
        abort(400, "Invalid JSON input")

    # 4. Serialize the JSON back into a string to pass to stdin
    input_json_string = json.dumps(input_data)

    try:
        # 5. Run the C++ executable as a subprocess
        process = subprocess.run(
            [CPP_EXECUTABLE_PATH],
            input=input_json_string,    # Pass data to stdin
            capture_output=True,        # Capture stdout/stderr
            text=True,                  # Work in text mode
            check=True                  # Raise error if C++ exits non-zero
        )

        # 6. Get the stdout (which contains our result JSON)
        output_json_string = process.stdout
        
        # 7. Parse the result JSON and send it back to three.js
        return jsonify(json.loads(output_json_string))

    except subprocess.CalledProcessError as e:
        # If the C++ code failed, send its stderr log back
        print("C++ Error:", e.stderr)
        abort(500, f"Computation failed: {e.stderr}")
    except json.JSONDecodeError:
        # If C++ printed garbage instead of JSON
        print("C++ output was not valid JSON:", process.stdout)
        abort(500, "Computation returned invalid JSON")
    except Exception as e:
        print("Server Error:", e)
        abort(500, str(e))

if __name__ == '__main__':
    # Run the server on localhost, port 5000
    print("Starting server on http://localhost:5000")
    app.run(debug=True, port=5000)