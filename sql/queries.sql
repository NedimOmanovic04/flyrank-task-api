-- PostgreSQL exploration: run inside psql against the Compose database.

-- 1. List every task in the database
SELECT * FROM tasks;

-- 2. Query only completed tasks
SELECT * FROM tasks WHERE done = TRUE;

-- 3. Count total number of tasks in the database
SELECT COUNT(*) AS total_tasks FROM tasks;

-- 4. Mark all tasks as completed
UPDATE tasks SET done = TRUE;

-- 5. Delete all completed tasks
DELETE FROM tasks WHERE done = TRUE;
