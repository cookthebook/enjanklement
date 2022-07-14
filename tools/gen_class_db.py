import json
import requests
from typing import List, Dict, Optional
import os

formats: dict
basics: list
cards: dict

class JankClass():
    def __init__(self):
        pass

    @staticmethod
    def card_legal(card: dict) -> bool:
        # only english cards
        if card['lang'] != 'en':
            return False

        # no reserved list
        if card['reserved'] is True:
            return False

        # paper only
        if card['digital'] is True:
            return False

        # no basic lands
        if card['name'] in basics:
            return False

        # no gold borders:
        if card['border_color'] == 'gold':
            return False

        return True



class JankBringer(JankClass):
    @staticmethod
    def card_legal(card: dict) -> bool:
        if JankClass.card_legal(card) is False:
            return False

        return card['set'] in formats['pioneer']



class JankWalker(JankClass):
    @staticmethod
    def card_legal(card: dict) -> bool:
        if JankClass.card_legal(card) is False:
            return False

        return card['set'] in formats['standard']



def gen_db(jank_class: JankClass):
    cards_all: List[dict] = []
    cards_db: Dict[dict] = {}

    # First, just get every card we could possibly care about

    print(f'Generating {jank_class.__name__} card database')
    for card in cards:
        if not jank_class.card_legal(card):
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
    fd = open(f'../website/media/{jank_class.__name__.lower()}.json', 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()



def main():
    global formats
    global basics
    global cards

    os.chdir(os.path.dirname(__file__))

    formats = json.load(open('../website/media/formats.json', 'r'))
    basics = json.load(open('../website/media/basics.json', 'r'))['basics']

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

    for jank_class in [ JankWalker, JankBringer ]:
        gen_db(jank_class)

    print('Done')

if __name__ == '__main__':
    main()
