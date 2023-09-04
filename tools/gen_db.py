import json
import os
import sys
import datetime
from typing import List, Dict, Optional
import requests

def main():
    outpath = '../website/media/jank.json'
    if len(sys.argv) > 1:
        if sys.argv[1] == '-h':
            print('Usage: gen_db.py [output.json]')
            print('   output.json: defaults to "../website/media/jank.json"')
            sys.exit(0)

        outpath = sys.argv[1]

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

    cards_all: List[dict] = []
    cards_db: Dict[dict] = {}

    banlist = json.load(open('../website/media/banlist.json', 'r'))['banlist']
    print(banlist)

    # First, just get every card we could possibly care about
    for card in cards:
        # filter cards that are banned in any format
        legalities: Dict[str, str] = card['legalities']
        if (
            legalities['vintage'] in [ 'not_legal', 'banned', 'restricted' ] or
            legalities['legacy'] == 'banned' or
            legalities['modern'] == 'banned' or
            legalities['pioneer'] == 'banned' or
            legalities['pauper'] == 'banned' or
            legalities['historic'] == 'banned'
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
        # banlist
        # dev note: banlist is not for cards that are considered
        # overpowered per se, but rather for cards that don't fit
        # the scope of being more friendly towards semi competetive
        # 1v1 gameplay. The banlist includes cards that grant the monarch
        # and the initiative, cards with weaknesses intended for 
        # multiplayer or drafting, outdated color hose designs that are
        # overly brutal to basic mana bases, and cards known to be able
        # to initiate two card infinite loops, particularly at lower mana
        if card['name'] in banlist:
            print(f'{card["name"]} banned')
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

        if card.get('image_uris') is not None:
            image_link = card['image_uris']['normal']
        else:
            image_link = card['card_faces'][0]['image_uris']['normal']

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
                'sets': { card['set']: card['uri'] }
            }
            continue

        db_card = cards_db[card['name']]

        if card['price'] < db_card['price']:
            db_card['price'] = card['price']
            # Use the link/image from the cheapest version of a card
            db_card['uri'] = card['uri']
            db_card['image'] = card['image']
        if card['points'] < db_card['points']:
            db_card['points'] = card['points']
        if card['set'] not in db_card['sets']:
            db_card['sets'][card['set']] = card['uri']

    # filter out cards that do not meet the price threshold (and sort by name)
    names = sorted(list(cards_db.keys()))

    prices = []
    for name in names:
        card = cards_db[name]
        prices.append(card['price'])
    prices = sorted(prices)
    bulk_ths = prices[int(len(prices)*0.67)]

    rare_prices = []
    for name in names:
        card = cards_db[name]
        if(card['points'] == 2):
            rare_prices.append(card['price'])
    rare_prices = sorted(rare_prices)
    rare_ths = rare_prices[int(len(rare_prices)*0.55)]

    if bulk_ths < 0.25:
        bulk_ths = 0.25

    uncommon_ths = (rare_ths + bulk_ths) / 2

    print(f'Price threshold: {bulk_ths}, rare thresh: {rare_ths}, unc ths: {uncommon_ths}')

    for name in names:
        card = cards_db[name]
        price = card['price']

        if card['points'] >= 2:
            if (price > rare_ths):
                cards_db.pop(name)
        elif card['points'] == 1:
            if (price > uncommon_ths):
                cards_db.pop(name)
        elif price > bulk_ths:
            cards_db.pop(name)

    # output in slightly special way
    card_lines = []
    names = sorted(list(cards_db.keys()))
    for name in names:
        name_esc = name.replace('"', '\\"')
        cards_db[name]["date"] = datetime.datetime.now().strftime("%Y-%m-%d")
        card_lines.append(f'  "{name_esc}": ' + json.dumps(cards_db[name]))
    fd = open(outpath, 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

if __name__ == '__main__':
    main()
