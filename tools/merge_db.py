import sys
import json

def main():
    if len(sys.argv) != 3:
        print('Usage merge_db.py <current_list.json> <new_list.json>')
        sys.exit(0)

    curlist = sys.argv[1]
    newlist = sys.argv[2]

    curdb = json.load(open(curlist, 'r'))
    newdb = json.load(open(newlist, 'r'))

    curnames = list(curdb.keys())
    newnames = list(newdb.keys())

    for name in newnames:
        if name not in curnames:
            print(f'New card {name}')
            curdb[name] = newdb[name]

    # output in slightly special way
    card_lines = []
    names = sorted(list(curdb.keys()))
    for name in names:
        name_esc = name.replace('"', '\\"')
        card_lines.append(f'  "{name_esc}": ' + json.dumps(curdb[name]))
    fd = open(curlist, 'w')
    fd.write('{\n')
    fd.write(',\n'.join(card_lines))
    fd.write('\n}')
    fd.close()

if __name__ == '__main__':
    main()
