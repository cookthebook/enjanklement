import sys
import json

def main():
    if len(sys.argv) != 3:
        print('Usage: run_bans <jank.json> <banlist.json>')
        sys.exit(1)

    jank_cards = json.load(open(sys.argv[1], 'r'))
    jank_card_names = list(jank_cards.keys())
    banlist = json.load(open(sys.argv[2], 'r'))['banlist']

    for card in banlist:
        if card in jank_card_names:
            print(f'Ban card {card}')
            del jank_cards[card]

    # output in slightly special way
    card_lines = []
    names = sorted(list(jank_cards.keys()))
    for name in names:
        name_esc = name.replace('"', '\\"')
        card_lines.append(f'  "{name_esc}": ' + json.dumps(jank_cards[name]))
    fd = open(sys.argv[1], 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

if __name__ == '__main__':
    main()
