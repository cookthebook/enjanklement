import json
import sys
from typing import List, Dict, Optional

def main():
    # acquire this file from https://scryfall.com/docs/api/bulk-data
    fd = open('default-cards.json', 'r')
    cards: List[dict] = json.load(fd)
    fd.close()

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

        #capture tix as an additional comparison
        new_card['tix'] = card['prices'].get('tix')
        if new_card['tix'] is not None:
            new_card['tix'] = float(new_card['tix'])
        else:
            #if card has no tix value, max it out for comparison purpose later
            new_card['tix'] = sys.float_info.max

        #capture Penny Dreadful legality for additional comparison
        #Shoutouts to Penny Dreadful, the best way to play Magic Online :)
        new_card['penny'] = legalities['penny']

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
                'tix': card['tix'],
                'penny': card['penny'],
                'sets': { card['set']: card['uri'] }
            }
            continue

        db_card = cards_db[card['name']]

        if card['price'] < db_card['price']:
            db_card['price'] = card['price']
        if card['points'] < db_card['points']:
            db_card['points'] = card['points']
        if card['tix'] < db_card['tix']:
            db_card['tix'] = card['tix']
        if card['set'] not in db_card['sets']:
            db_card['sets'][card['set']] = card['uri']

    # filter out cards that do not meet the price threshold (and sort by name)
    names = sorted(list(cards_db.keys()))
    for name in names:
        card = cards_db[name]
        points = card['points']
        price = card['price']
        tix = card['tix']
        penny = card['penny']

        if points == 3 and price > 2.40 and tix > 0.09 and penny == 'not_legal':
            cards_db.pop(name)
        elif points == 2 and price > 1.60 and tix > 0.06 and penny == 'not_legal':
            cards_db.pop(name)
        elif points == 1 and price > 0.80 and tix > 0.03 and penny == 'not_legal':
            cards_db.pop(name)
        elif points == 0 and price > 0.40:
            cards_db.pop(name)
    
    prices_m = []
    prices_r = []
    prices_u = []
    for name in cards_db:
        card = cards_db[name]
        points = card['points']
        price = card['price']

        if points == 3:
            prices_m.append(price)
        if points == 2:
            prices_r.append(price)
        if points == 1:
            prices_u.append(price)

    prices_m = sorted(prices_m)
    prices_r = sorted(prices_r)
    prices_u = sorted(prices_u)

    thresh_m = prices_m[int(len(prices_m) * 0.005)]
    thresh_r = prices_r[int(len(prices_r) * 0.005)]
    thresh_u = prices_u[int(len(prices_u) * 0.005)]

    names = list(cards_db.keys())
    for name in names:
        card = cards_db[name]
        points = card['points']
        price = card['price']

        if points == 3 and price > thresh_m:
            cards_db.pop(name)
        elif points == 2 and price > thresh_r:
            cards_db.pop(name)
        elif points == 1 and price > thresh_u:
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
