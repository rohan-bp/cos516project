import sys
import time
import random
import matplotlib.pyplot as plt
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
        clause = formula.clauses[selection[i] - sub]
        clause.remove(-selection[i])
        clauses.append(clause)
    return clauses
    
# Min Unsat Core
# If the problem is UNSAT, add the m extra selector variables
# where m is the number of clauses in the original database
def findMinUnsatCore(formula):

    solver = Glucose3(bootstrap_with = formula.clauses)
    
    if(solver.solve()):
        print("This formula is satisfiable")
        solver.delete()
        return None
    
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
    
    minCore = extractClauses(newFormula, minCore)
    print("The clauses in the Min Unsat Core are: ", minCore)
    
    newSolver.delete()
    
    return minCore
    

# Function to test the performance of our Unsat Core Approach
# Keeps increasing the number of formulas and computes execution time
# Used in the performance study in the report
def performanceStudy():
    
    formula = CNF()
    formula.append([5,-2])
    formula.append([6,-2])
    formula.append([2, 3, 4, -1])
    
    vars = list(range(-6,0)) + list(range(1,7))
    
    x = []
    y = []
    print(formula.clauses)
    for i in range(7):
        sel = random.sample(vars, 4)

        formula.clauses.append(sel)
        formula.append([-2])
        formula.append([2])
        
        print("Users: ", i," No. of clauses:", len(formula.clauses))
        
        start_time = time.time()
        findMinUnsatCore(formula)
        end = time.time()
        total_time = (end - start_time)
        print("--- %s seconds ---" % total_time)
        
        x.append(len(formula.clauses))
        y.append(total_time)
        
    plt.plot(x,y,color="forestgreen")
    plt.xlabel("No. of Clauses")
    plt.ylabel("Time in S")
    plt.title("Performance Study: Runtime vs No. of Clauses")
    plt.savefig("perfstudy.png",dpi=300)

if __name__ == "__main__":
    
    performanceStudy()
    quit()
    
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
    
    
