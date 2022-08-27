import json
import os
import sys
from typing import List, Dict, Optional
import requests

def main():
    # acquire this file from https://scryfall.com/docs/api/bulk-data
    print('Downloading card data from Scryfall')
    if not os.path.exists('default-cards.json'):
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
        cards = json.loads(open('default-cards.json', 'r').read())

    cards_all: List[dict] = []
    cards_db: Dict[dict] = {}

    # First, just get every card we could possibly care about
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

        # add this to the list, prices and rarity get sorted out later
        cards_all.append(new_card)



    # Then, create a unique dictionary of cards with lowest price, rarity, and all
    # possible sets
    for card in cards_all:
        if cards_db.get(card['name']) is None:
            cards_db[card['name']] = {
                'points': card['points'],
                'price': card['price'],
                'sets': { card['set']: card['uri'] }
            }
            continue

        db_card = cards_db[card['name']]

        if card['price'] < db_card['price']:
            db_card['price'] = card['price']
        if card['points'] < db_card['points']:
            db_card['points'] = card['points']
        if card['set'] not in db_card['sets']:
            db_card['sets'][card['set']] = card['uri']

    # filter out cards that do not meet the price threshold (and sort by name)
    names = sorted(list(cards_db.keys()))

    rare_prices = []
    for name in names:
        card = cards_db[name]
        if card['points'] != 2:
            continue
        rare_prices.append(card['price'])
    rare_prices = sorted(rare_prices)
    rare_ths = rare_prices[int(len(rare_prices)*0.75)]
    mythic_ths = rare_ths * 1.5
    uncom_ths = rare_ths / 2

    print(f'Prices:\nMythic: {mythic_ths}\nRare: {rare_ths}\nUncommon: {uncom_ths}')

    for name in names:
        card = cards_db[name]
        points = card['points']
        price = card['price']

        if points == 3 and price > mythic_ths:
            cards_db.pop(name)
        elif points == 2 and price > rare_ths:
            cards_db.pop(name)
        elif points == 1 and price > uncom_ths:
            cards_db.pop(name)
        elif points == 0 and price > 0.25:
            cards_db.pop(name)

    # output in slightly special way
    card_lines = []
    names = sorted(list(cards_db.keys()))
    for name in names:
        name_esc = name.replace('"', '\\"')
        card_lines.append(f'  "{name_esc}": ' + json.dumps(cards_db[name]))
    fd = open('../website/media/jank.json', 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

if __name__ == '__main__':
    main()
