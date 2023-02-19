#!/bin/bash

rm default-cards.json
echo "Generating new DB"
python3 gen_db.py new_list.json
echo "Merging with website DB"
python3 merge_db.py ../website/media/jank.json new_list.json
