#!/usr/bin/env python3
"""
Script to run the chess game tests.
Make sure the chess application is running before executing this script.
"""

import unittest
import sys
import os

def run_tests():
    """Run the chess game tests"""
    print("Running chess game tests...")
    print("Make sure the chess application is running at http://localhost:5001")
    
    # Add the current directory to the path so we can import the test module
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    
    # Import the test module
    from test_chess import ChessGameTest
    
    # Create a test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(ChessGameTest)
    
    # Run the tests
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    
    # Return the result
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

# Made with Bob
