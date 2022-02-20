import json
import requests
from typing import List, Dict, Optional

def main():
    # acquire this file from https://scryfall.com/docs/api/bulk-data
    print('Downloading card data from Scryfall')
    req = requests.get('https://api.scryfall.com/bulk-data')
    bulk_data = req.json()
    for obj in bulk_data['data']:
        if obj['type'] != 'default_cards':
            continue

        req = requests.get(obj['download_uri'])
        cards = req.json()
        print('Done')

    cards_all: List[dict] = []
    cards_db: Dict[dict] = {}

    # First, just get every card we could possibly care about
    print('Generating standard card database')
    for card in cards:
        # standard cards only
        legalities: Dict[str, str] = card['legalities']
        if legalities['standard'] != 'legal':
            continue
        # only english cards
        if card['lang'] != 'en':
            continue
        # no reserved list
        if card['reserved'] is True:
            continue
        # paper only
        if card['digital'] is True:
            continue
        # no basic lands
        if card['name'] in [
            'Swamp',
            'Island',
            'Mountain',
            'Forest',
            'Plains',
            'Snow-Covered Swamp',
            'Snow-Covered Island',
            'Snow-Covered Mountain',
            'Snow-Covered Forest',
            'Snow-Covered Plains',
            'Wastes'
        ]:
            continue
        # no gold borders:
        if card['border_color'] == 'gold':
            continue



        # get key information
        new_card = {}

        new_card['name'] = card['name']
        new_card['set'] = card['set']

        rarity = card['rarity']
        if rarity == 'common':
            rarity = 0
        elif rarity == 'uncommon':
            rarity = 1
        elif rarity == 'rare':
            rarity = 2
        else:
            rarity = 3
        new_card['points'] = rarity

        new_card['uri'] = card['scryfall_uri']

        # add this to the list, prices and rarity get sorted out later
        cards_all.append(new_card)



    # Then, create a unique dictionary of cards with lowest price, rarity, and all
    # possible sets
    for card in cards_all:
        if cards_db.get(card['name']) is None:
            cards_db[card['name']] = {
                'points': card['points'],
                'sets': { card['set']: card['uri'] }
            }
            continue

        db_card = cards_db[card['name']]

        if card['points'] < db_card['points']:
            db_card['points'] = card['points']
        if card['set'] not in db_card['sets']:
            db_card['sets'][card['set']] = card['uri']

    # output in slightly special way
    card_lines = []
    names = sorted(list(cards_db.keys()))
    for name in names:
        name_esc = name.replace('"', '\\"')
        card_lines.append(f'  "{name_esc}": ' + json.dumps(cards_db[name]))
    fd = open('../website/media/jank_standard.json', 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

    print('Done')

if __name__ == '__main__':
    main()
