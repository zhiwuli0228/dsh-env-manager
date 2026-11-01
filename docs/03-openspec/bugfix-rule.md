# Bugfix Rule

A bugfix addresses a specific, reproducible defect.

## Required Sections

### 1. Symptom

What went wrong.

### 2. Root Cause

Why it happened.

### 3. Fix

What changed.

### 4. Regression Test

Test that prevents recurrence.

### 5. Verification

How to confirm the fix.

## Rules

- Include a regression test unless the bug is UI-only.
- Update `current-state.md` if the bug affects implemented features.
