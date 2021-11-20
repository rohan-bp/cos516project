import json
import time
from flask import Flask, request, redirect, g, render_template, Response, url_for, jsonify
from celery import Celery
import requests
from urllib.parse import quote
from credentials import *
from songScraper import *

# Authentication Steps, paramaters, and responses are defined at https://developer.spotify.com/web-api/authorization-guide/
# Visit this url to see all the steps, parameters, and expected response.


app = Flask(__name__)
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

# Spotify URLS
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE_URL = "https://api.spotify.com"
API_VERSION = "v1"
SPOTIFY_API_URL = "{}/{}".format(SPOTIFY_API_BASE_URL, API_VERSION)

# Server-side Parameters
CLIENT_SIDE_URL = "http://127.0.0.1"
PORT = 8080
REDIRECT_URI = "{}:{}/callback/q".format(CLIENT_SIDE_URL, PORT)
SCOPE = "user-top-read user-read-recently-played"
STATE = ""
SHOW_DIALOG_bool = True
SHOW_DIALOG_str = str(SHOW_DIALOG_bool).lower()

auth_query_parameters = {
    "response_type": "code",
    "redirect_uri": REDIRECT_URI,
    "scope": SCOPE,
    "client_id": sp_client_id
}


# Celery Task that runs the song scraper AWS Lambda request in the background
@celery.task(bind = True)
def background_task(self, top_data, recent_data):
    return parse_list(self, top_data, recent_data)


# Route to query the current status of a task
@app.route("/status/<task_id>")
def taskstatus(task_id):
    task = background_task.AsyncResult(task_id)
    
    response = {'state': task.state}
    # If the job hasn't started
    if task.state == 'PENDING':
        pass
    elif task.state == 'PROGRESS':
        response['current'] = task.info['current']
        response['total'] = task.info['total']
    elif task.state == 'SUCCESS':
        response['result'] = task.info
    else:
        # In the case of an error
        response['status'] = str(task.info) # The error message itself

    return jsonify(response)


# The default route
@app.route("/")
def index():
    # Auth Step 1: Authorization
    url_args = "&".join(["{}={}".format(key, quote(val)) for key, val in auth_query_parameters.items()])
    auth_url = "{}/?{}".format(SPOTIFY_AUTH_URL, url_args)
    return redirect(auth_url)

# Callback upon authentication
@app.route("/callback/q")
def callback():
    # Auth Step 4: Requests refresh and access tokens
    auth_token = request.args['code']
    code_payload = {
        "grant_type": "authorization_code",
        "code": str(auth_token),
        "redirect_uri": REDIRECT_URI,
        "client_id": sp_client_id,
        "client_secret": sp_client_secret,
    }
    post_request = requests.post(SPOTIFY_TOKEN_URL, data=code_payload)

    # Auth Step 5: Tokens are Returned to Application
    response_data = json.loads(post_request.text)
    access_token = response_data["access_token"]
    refresh_token = response_data["refresh_token"]
    token_type = response_data["token_type"]
    expires_in = response_data["expires_in"]

    # Auth Step 6: Use the access token to access Spotify API
    authorization_header = {"Authorization": "Bearer {}".format(access_token)}

    # Get profile data
    user_profile_api_endpoint = "{}/me".format(SPOTIFY_API_URL)
    profile_response = requests.get(user_profile_api_endpoint, headers=authorization_header)
    profile_data = json.loads(profile_response.text)

    # Get top tracks data
    recent_api_endpoint = "{}/me/player/recently-played".format(SPOTIFY_API_URL)
    params = {'limit':20}
    recent_response = requests.get(recent_api_endpoint, headers=authorization_header, params=params)
    recent_data = json.loads(recent_response.text)

    # Get most recent tracks data
    top_api_endpoint = "{}/me/top/tracks".format(SPOTIFY_API_URL)
    params = {'limit':20}
    top_response = requests.get(top_api_endpoint, headers=authorization_header, params=params)
    top_data = json.loads(top_response.text)

    task = background_task.apply_async(args=[top_data,recent_data])
    status_url = url_for('taskstatus', task_id=task.id)
    data = {"status_url": status_url}
    
    # We pass in the data variable to keep track of state
    return render_template("index.html", data=data)

@app.route('/progress')
def progress():
    def generate():
        for i in range(10):
            yield "data:" + str(i * 10) + "\n\n"
            time.sleep(0.5)
    return Response(generate(), mimetype='text/event-stream')

if __name__ == "__main__":
    app.run(debug=True, port=PORT)
