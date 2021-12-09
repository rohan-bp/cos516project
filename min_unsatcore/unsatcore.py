import sys
from itertools import product
from pysat.formula import CNF
from pysat.solvers import Glucose3
from pysat.examples.models import enumerate_models



# Construct the new formula, now with one selector variable for each clause
def addSelectorVariables(solver, formula):

    numClauses = len(formula.clauses)
    maxVar = formula.nv
    
    selectorVar = maxVar + 1
    selectorVars = []
    newFormula = CNF()
    
    for i in range(len(formula.clauses)):
        clause = formula.clauses[i]
        clause.append(-selectorVar)
        newFormula.append(clause)
        selectorVars.append(selectorVar)
        selectorVar += 1
        
    return newFormula, selectorVars

# Takes the selector vars and an array of 1s and 0s, converts the array to assumptions
def convertBooleanArray(selectorVars, boolArr):

    if(len(boolArr) != len(selectorVars)):
        print("Arrays not equal")
        return []
        
    assumptions = []
    selection = []
    
    for i in range(len(selectorVars)):
        if(boolArr[i] == 0):
            assumptions.append(selectorVars[i] * -1)
        else:
            assumptions.append(selectorVars[i] * 1)
            selection.append(selectorVars[i])
    
    return assumptions, selection
    
# Takes a formula and some selection vars, returns the minimum unsat core
def extractClauses(formula,selection):

    clauses = []
    sub = formula.nv + 1
    for i in range(len(selection)):
        clauses.append(formula.clauses[selection[i] - sub])
    return clauses
    
# Min Unsat Core
# If the problem is UNSAT, add the m extra selector variables
# where m is the number of clauses in the original database
def findMinUnsatCore(formula):

    solver = Glucose3(bootstrap_with = formula.clauses)
    
    if(solver.solve()):
        print("This formula is satisfiable")
        return
    
    print("This formula is unsatisfiable, searching for a minimum unsat core")
    
    solver.delete()
    
    newFormula, selectorVars  = addSelectorVariables(solver, formula)
    
    newSolver = Glucose3(bootstrap_with = newFormula.clauses)
    
    currentMin = len(newFormula.clauses)
    minCore = None
    
    unsatCores = {}
    
    if(len(selectorVars) > 26):
        print("This formula will take a while to run, there are ",len(selectorVars)," clauses")
    
    for i in product(range(2), repeat=len(selectorVars)):
    
        assumptionsArr,selection = convertBooleanArray(selectorVars,i)
        
        if(not newSolver.solve(assumptions = assumptionsArr)):
            if(len(selection) < currentMin):
                currentMin = len(selection)
                minCore = selection
    
    print("The clauses in the Min Unsat Core are: ", extractClauses(newFormula, minCore))
    
    newSolver.delete()
    

if __name__ == "__main__":
    
    formula = None
    
    if(len(sys.argv) > 1):
        formula = CNF(from_file = sys.argv[1])
        
    else:
        formula = CNF()
        
        # Simple UNSAT example from the Paper for testing
        formula.append([1, -3])
        formula.append([-2, 3])
        formula.append([2])
        formula.append([-2, -3])
        formula.append([2,3])
        formula.append([-1,2,-3])
    
    findMinUnsatCore(formula)
    
    
