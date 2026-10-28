-- Stage 4: Hand-crafted SQL Exploration Queries

-- 1. List every task in the database
SELECT * FROM tasks;

-- 2. Query only completed tasks
SELECT * FROM tasks WHERE done = 1;

-- 3. Count total number of tasks in the database
SELECT COUNT(*) AS total_tasks FROM tasks;

-- 4. Mark all tasks as completed
UPDATE tasks SET done = 1;

-- 5. Delete all completed tasks
DELETE FROM tasks WHERE done = 1;
