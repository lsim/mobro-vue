#!/bin/bash

# This script is to be run after the code is deployed to its hosting environment

user="$1"

if [ -z "$user" ]; then
  echo "Please provide the username for the service to use as the first argument"
  exit 1
fi

cat > /etc/systemd/system/mobro.service << HEREDOC_END

[Unit]
Description      = Controls the MoBro service
Wants            = network-online.target
After            = network-online.target

[Service]
Type             = simple
ExecStart        = $(pwd)/start.sh
WorkingDirectory = $(pwd)
User             = $user

[Install]
WantedBy         = multi-user.target

HEREDOC_END

systemctl daemon-reload
systemctl enable mobro
