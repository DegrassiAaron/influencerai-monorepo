---
name: testing
description: Procedures and examples for writing and executing automated tests for software. Use this skill when verifying code correctness with unit, integration, or end-to-end tests.
license: MIT
allowed-tools:
  - python
  - bash
metadata:
  category: engineering
---
# Testing Guide

## Overview

This skill outlines test strategies, frameworks, and code examples to help you ensure your software behaves as expected.

### Test Strategy

1. **Unit tests** check individual functions or classes.
2. **Integration tests** verify that components work together.
3. **End-to-end (E2E) tests** simulate user workflows.

## Python Testing with pytest

### Installing pytest

```bash
pip install pytest pytest-cov
```

### Creating a test

Tests are functions that start with `test_` in files named `test_*.py`.

```python
# math_utils.py
def add(a, b):
    return a + b

# test_math_utils.py
from math_utils import add

def test_add():
    assert add(2, 3) == 5
```

Run tests:

```bash
pytest -vv --cov=.
```

### Using fixtures

Fixtures set up test data or state.

```python
import pytest

@pytest.fixture
def sample_data():
    return [1, 2, 3]

def test_length(sample_data):
    assert len(sample_data) == 3
```

## JavaScript Testing with Jest

### Installing Jest

```bash
npm install --save-dev jest
```

### Creating a test

```javascript
// sum.js
function sum(a, b) {
  return a + b;
}
module.exports = sum;

// sum.test.js
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

Add `"test": "jest"` to the scripts section of `package.json` and run:

```bash
npm test
```

## Test Coverage

Measure code coverage to find untested areas.

For pytest:

```bash
pytest --cov=my_package
```

For Jest:

```bash
npm test -- --coverage
```

## Mocking and Patching

Use mocking to isolate components.

```python
from unittest.mock import patch


def test_api_call(monkeypatch):
    def fake_request(url):
        return {"status": 200}
    monkeypatch.setattr(my_module, "make_request", fake_request)
    assert my_module.do_something() == 200
```

## TDD Workflow

1. **Write a failing test** that describes desired behavior.
2. **Implement minimal code** to pass the test.
3. **Refactor** for readability and maintainability.

Use this cycle iteratively to build robust software.

## Additional Resources

- pytest documentation
- Jest documentation
- Martin Fowler’s TDD article
