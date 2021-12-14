# cos516project

🤖 Conflict-Directed 🤗 Human Learning

There are two components to the project:

<h2>Policy Graph Application</h2>

The first is a ReactJS based application that allows for editing policy graphs, updating user preferences, and viewing conflicts.
The policy graph editor is accessed via *localhost:3000/policy/edit*.
User preferences can be submitted at *localhost:3000/pref*.
Conflicts can be viewed at *localhost:3000/policy/conflict*.

Submitted user preferences are stored in the Firebase database service.
The dependencies for the application can be installed via "npm install" from within the *cdhl/* directory.
The server is initialized by running "yarn start" in the *cdhl/* directory.

<h2>A Minimum UnSAT Core API</h2>

The backend is a Flask API that accepts POST requests with a JSON object in the body.
The JSON object must be policy graph expressed as a propositional formula along with users and their preferences/positions, also as propositional formulas.
The API returns a Minimum UnSAT Core of the current formula or otherwise indicates that the formula is satisifable.
The API can be accessed through the route localhost:8080/unsat.
It uses the PySAT API to implement an algorithm for computing Minimum Unsat Cores authored by [Lynce et al.](http://www.satisfiability.org/SAT04/programme/110.pdf) 

The dependencies for the API include Flask, Sympy, and PySAT. These can be installed via pip.
Python3.9+ is required and the server can be intialized by running "python flask_app.py" in the *backend/* directory.
