import sys
from pysat.formula import CNF
from pysat.solvers import Glucose3
from pysat.examples.models import enumerate_models



# Construct the new formula, now with one selector variable for each clause
def addSelectorVariables(solver, formula):

    numClauses = len(formula.clauses)
    maxVar = formula.nv
    
    selectorVar = maxVar + 1
    selectorVars = set()
    newFormula = CNF()
    
    for i in range(len(formula.clauses)):
        clause = formula.clauses[i]
        clause.append(-selectorVar)
        newFormula.append(clause)
        selectorVars.add(selectorVar)
        selectorVar += 1
        
    return newFormula, selectorVars



# TODO: Modify this to use the incremental behaviour of the API
    
# Min Unsat Core
# If the problem is UNSAT, add the m extra selector variables
# where m is the number of clauses in the original database
def findMinUnsatCore(formula):

    solver = Glucose3(bootstrap_with = formula.clauses)
    
    if(solver.solve()):
        print("This formula is satisfiable")
        return
    
    print("This formula is unsatisfiable")
    
    newFormula, selectorVars  = addSelectorVariables(solver, formula)
    
    newSolver = Glucose3(bootstrap_with = newFormula.clauses)
    
    currentMin = len(newFormula.clauses)
    minCore = None
    
    for m in newSolver.enum_models():
        
        count = 0
        for assignment in m:
            if(assignment in selectorVars or (assignment * -1) in selectorVars):
                if(assignment > 0):
                    count += 1
        
        if(count < currentMin and count != 0):
            currentMin = count
            minCore = m
    
    print("The selector variables for the minimum unsat core are: ", minCore)


if __name__ == "__main__":
    
    formula = None
    
    if(len(sys.argv) > 1):
        formula = CNF(from_file = sys.argv[1])
        
    else:
        formula = CNF()
        
        # Simple UNSAT example from the pysat docs for testing
        formula.append([-1, 2])
        formula.append([1, -2])
        formula.append([-1, -2])
        formula.append([1, 2])
    
    findMinUnsatCore(formula)
    
    
