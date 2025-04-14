
@echo off
REM Batch script to create necessary .js files in the server/db directory

echo Creating directory structure: server\db ...
REM Create the directory if it doesn't exist. Suppress error if it already exists.
mkdir server\db 2>nul

echo Creating JavaScript files in server\db ...

REM Use 'type nul >' to create empty files
type nul > server\db\connection.js
echo Created: server\db\connection.js

type nul > server\db\companies.js
echo Created: server\db\companies.js

type nul > server\db\contacts.js
echo Created: server\db\contacts.js

type nul > server\db\communications.js
echo Created: server\db\communications.js

type nul > server\db\meetings.js
echo Created: server\db\meetings.js

type nul > server\db\dashboard.js
echo Created: server\db\dashboard.js

type nul > server\db\search.js
echo Created: server\db\search.js

type nul > server\db\users.js
echo Created: server\db\users.js

echo.
echo All specified files created successfully in server\db.

REM You can add 'pause' below if you want the window to stay open after running by double-clicking
REM pause
