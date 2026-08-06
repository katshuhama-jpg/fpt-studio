#!/bin/bash
cd ~/fptaiagents
fswatch -o . | while read; do
  git add .
  git commit -m "auto update $(date '+%Y-%m-%d %H:%M:%S')"
  git push target main:main
  echo "Pushed at $(date)"
done

