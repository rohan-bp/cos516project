import json
import time
import sympy
from sympy.parsing.sympy_parser import parse_expr
import sys
from pysat.formula import CNF
from unsatcore import findMinUnsatCore
from flask import Flask, request, redirect, g, render_template, Response, url_for, jsonify
from flask_cors import CORS

PORT = 8080
app = Flask(__name__)
CORS(app)
testCase = "A >> (B|C|D) & B >> (F & G)"


# Formulastr is the conjunction of the original formula and each user's preferences
# Mapping assigns variables in the prop. formula to natural nos.
# Returns a CNF that can be read by unsatcore
def convertToCNF(formulaStr, mapping):
    local_names = {}
    for propSymbol in mapping.keys():
        local_names[propSymbol] = sympy.Symbol(propSymbol)

    newFormula = str(sympy.to_cnf(parse_expr(formulaStr, local_dict=local_names)))

    clauses = newFormula.split("&")

    cnfFormula = CNF()

    for clause in clauses:
        terms = clause.split("|")

        currClause = []
        for term in terms:
            term = term.replace("(","")
            term = term.replace(")","")

            multiplier = 1
            if("~" in term):
                multiplier = -1

            term = term.replace("~","")
            term = term.strip()

            currClause.append(multiplier * mapping[term])

        cnfFormula.append(currClause)

    return cnfFormula

# Takes a JSON object and returns a mapping of propositional variables to integers
# This mapping can then be used in the convertToCNF function
def convertFromJSON(requestData):
    mapping = {}
    mapping["common"] = {v: i + 1 for i, v in enumerate(requestData["props"])}

    cnfFormula = CNF()
    for key in requestData["formulas"].keys():
        cnfSubFormula = convertToCNF(requestData["formulas"][key], mapping["common"])
        mapping[key + "clauses"] = cnfSubFormula.clauses

        for clause in cnfSubFormula.clauses:
            cnfFormula.append(clause)

    return cnfFormula,mapping

# Returns a key based on the value
def get_key(val,my_dict):
    for key, value in my_dict.items():
         if val == value:
             return key
    return None

# Uses the common map to convert a clause in CNF back to a string
def reverseCommonMap(clause,mapping):

    reversed = "("
    for elem in clause:
        propVar = get_key(abs(elem),mapping)
        if(elem < 0):
            reversed = reversed + "~" + propVar + " | "
        else:
            reversed = reversed + propVar + " | "
    return reversed[:-3] + ")"

# Reverses the mapping process done in the previous function i.e., numbers to letters, returns a per user clause by clause breakdown
def reverseMapping(minCore,mapping):

    res = {"result":"Unsatisfiable", "conflict": {}}
    for clause in minCore:
        print(clause,file=sys.stderr)
        for key in mapping.keys():
            if("clauses" in key):

                if(clause in mapping[key]):

                    origClause = reverseCommonMap(clause,mapping["common"])

                    userNo = key.replace("clauses","")
                    if(userNo not in res["conflict"].keys()):
                        res["conflict"][userNo] = []
                    res["conflict"][userNo].append(origClause)

    # Returns a dict that can be JSONified
    print(res,file=sys.stderr)
    return res

@app.route("/unsat", methods=["POST"])
def compute_unsat():
    requestData = request.get_json(force = True)
    cnfFormula, mapping = convertFromJSON(requestData)

    minCore = findMinUnsatCore(cnfFormula)

    if(not minCore):
        response = jsonify({"result":"Satisfiable"})
        response.status_code = 200
        return response

    response = jsonify(reverseMapping(minCore,mapping))
    response.status_code = 200
    return response

if __name__ == "__main__":
    #convertToCNF("(A >> (B|C|D) & B >> (F & G)) & (A & B) & (B & C)", {})
    app.run(debug=True, port=PORT)

"""
{
    "formula" : "A >> (B|C|D) & B >> (F & G)",
    "user1" : "(A)",
    "user2" : "(C)",
    "user3" : "(B)",
    "user4" : "(~B)"
}
"""
