@echo off
REM Build script for SKILL-Development-Ground-Rules.zip
REM This script creates a properly formatted Skills zip file from the source markdown

echo Building SKILL-Development-Ground-Rules.zip...

REM Copy source to SKILL.md
copy /Y SKILL-Development-Ground-Rules.md SKILL.md >nul

REM Create zip using PowerShell
powershell -Command "Compress-Archive -Path SKILL.md -DestinationPath SKILL-Development-Ground-Rules.zip -Force"

REM Clean up temporary file
del SKILL.md

echo Done! SKILL-Development-Ground-Rules.zip created successfully.
echo Remember to upload this to Claude Skills interface.
