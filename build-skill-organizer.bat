@echo off
REM Build script for SKILL-Amazon-Book-Organizer.zip
REM This script creates a properly formatted Skills zip file from the source markdown

echo Building SKILL-Amazon-Book-Organizer.zip...

REM Copy source to SKILL.md
copy /Y SKILL-Amazon-Book-Organizer.md SKILL.md >nul

REM Create zip using PowerShell
powershell -Command "Compress-Archive -Path SKILL.md -DestinationPath SKILL-Amazon-Book-Organizer.zip -Force"

REM Clean up temporary file
del SKILL.md

echo Done! SKILL-Amazon-Book-Organizer.zip created successfully.
echo Remember to upload this to Claude Skills interface.
