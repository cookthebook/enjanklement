import json
import os
import sys
from typing import List, Dict, Optional
import requests

def main():
    outpath = '../website/media/jank_modified.json'

    # acquire this file from https://scryfall.com/docs/api/bulk-data
    if not os.path.exists('default-cards.json'):
        print('Downloading card data from Scryfall')
        req = requests.get('https://api.scryfall.com/bulk-data')
        bulk_data = req.json()
        for obj in bulk_data['data']:
            if obj['type'] != 'default_cards':
                continue

            req = requests.get(obj['download_uri'])
            cards = req.json()
            print('Done')
        f = open('default-cards.json', 'w')
        f.write(json.dumps(cards))
        f.close()
    else:
        print('default-cards.json exists')
        cards = json.loads(open('default-cards.json', 'r').read())

    jank_list_cards = json.load(open('../website/media/jank.json', 'r'))
    jank_list_card_names = list(jank_list_cards.keys())
    cards_all: List[dict] = []
    cards_db: Dict[dict] = {}

    # Try to find the lowest gatherer multiverse ID for a cards preview image
    # and Scryfall link. This means you won't get some weird promo preview art
    # for a card in the list website
    for card in cards:
        # filter cards that are banned in any format
        legalities: Dict[str, str] = card['legalities']
        if (
            legalities['vintage'] in [ 'not_legal', 'banned', 'restricted' ] or
            legalities['legacy'] == 'banned' or
            legalities['modern'] == 'banned' or
            legalities['pioneer'] == 'banned' or
            legalities['pauper'] == 'banned'
        ):
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
        if card['name'] not in jank_list_card_names:
            continue

        if card.get('image_uris') is not None:
            image_link = card['image_uris']['normal']
        else:
            image_link = card['card_faces'][0]['image_uris']['normal']

        # get key information
        new_card = {}

        new_card['name'] = card['name']
        new_card['set'] = card['set']

        # do not consider cards without pricings
        price = card['prices']['usd']
        price_foil = card['prices']['usd_foil']
        price_low: float
        if price is None and price_foil is not None:
            price_low = float(price_foil)
        elif price is not None and price_foil is None:
            price_low = float(price)
        elif price is not None and price_foil is not None:
            price_low = float(price)
            if float(price_foil) < price_low:
                price_low = float(price_foil)
        else:
            continue
        new_card['price'] = price_low

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
        new_card['image'] = image_link

        # add this to the list, prices and rarity get sorted out later
        cards_all.append(new_card)

    # Then, create a unique dictionary of cards with lowest price, rarity, and all
    # possible sets
    for card in cards_all:
        if cards_db.get(card['name']) is None:
            cards_db[card['name']] = {
                'points': card['points'],
                'price': card['price'],
                'uri': card['uri'],
                'image': card['image']
            }
            continue

        db_card = cards_db[card['name']]

        if card['price'] < db_card['price']:
            db_card['price'] = card['price']
            db_card['uri'] = card['uri']
            db_card['image'] = card['image']
        if card['points'] < db_card['points']:
            db_card['points'] = card['points']

    for db_card in cards_db:
        jank_list_cards[db_card]['image'] = cards_db[db_card]['image']
        jank_list_cards[db_card]['uri'] = cards_db[db_card]['uri']

    for jank_card in jank_list_cards:
        if jank_list_cards[jank_card].get('image') is None:
            print(f'NO IMAGE FOR CARD {jank_card}')
        del jank_list_cards[jank_card]['sets']

    # output in slightly special way
    card_lines = []
    names = sorted(jank_list_card_names)
    for name in names:
        name_esc = name.replace('"', '\\"')
        card_lines.append(f'  "{name_esc}": ' + json.dumps(jank_list_cards[name]))
    fd = open(outpath, 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

if __name__ == '__main__':
    main()
