/* load common navbar in pages */
var navbar = document.getElementById('JankNavbar');
navbar.classList.add('navbar');
navbar.innerHTML = `
<section class="navbar-section">
    <h1><a href="index.html">JANK!</a></h1>
    <div class="divider-vert"></div>
    <a href="deck.html" class="btn">Deck Checker</a>
</section>`;

/** @type {string[]} */
var BASIC_LANDS;
/** @type {string[][]} */
var FORMATS;
/** @type {Object} */
var JANKWALKER_DB;
/** @type {Object} */
var JANKBRINGER_DB;

class DeckChecker {
    constructor(
        card_db,
        main = { min: 40, max: Infinity, points: 15, dups: { 2: 6, 3: 0 } },
        side = { min: 0, max: 10, points: 10, dups: { 2: Infinity, 3: 0 } },
        set_list = null
    ) {
        this.card_db = card_db;
        this.main = main;
        this.side = side;
        this.set_list = set_list;
        this.result = {};
    }

    check(deck, out_elem) {
        this.result = {};

        this._check_cards(deck.main, this.main);
        if (this.result.legal === false) {
            this.result.reason = '(Main Board) ' + this.result.reason;
            this._render_result(deck, out_elem);
            return this.result;
        }

        this._check_cards(deck.side, this.side);
        if (this.result.legal === false) {
            this.result.reason = '(Side Board) ' + this.result.reason;
            this._render_result(deck, out_elem);
            return;
        }

        this.result.legal = true;
        this._render_result(deck, out_elem);
    }

    _check_cards(cards, rules) {
        var size = 0;
        var points = 0;
        var dups = { 2: 0, 3: 0 };

        /* iterate through cards to tally up card counts, dups, and points */
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var dbcard = this.card_db[card.name];

            size += card.count;

            /* basics do not count toward points or dupes */
            if (BASIC_LANDS.includes(card.name)) {
                continue;
            }

            if (dbcard === undefined) {
                this.result = {
                    legal: false,
                    reason: `Card "${card.name}" not in legal card list`
                };
                return;
            }

            if (this.set_list !== null) {
                var card_sets = Object.keys(dbcard.sets);
                var in_set_list = false;

                console.debug('Check if', this.set_list, 'contains', card_sets)

                for (var card_set = 0; card_set < card_sets.length; card_set++) {
                    if (this.set_list.includes(card_sets[card_set])) {
                        in_set_list = true;
                        break;
                    }
                }

                if (!in_set_list) {
                    this.result = {
                        legal: false,
                        reason: `Card "${card.name}" is not in the list of selected sets`
                    };
                    return;
                }
            }

            if (card.count > 3) {
                this.result = {
                    legal: false,
                    reason: `Too many duplicates of "${card.name}"`
                };
                return;
            }
            else if (card.count > 1) {
                dups[card.count]++;
            }

            points += card.count * (this.card_db[card.name].points);
        }

        if (size > rules.max) {
            this.result = {
                legal: false,
                reason: `Too many cards (${size} > ${rules.max})`
            };
            return;
        }
        else if (size < rules.min) {
            this.result = {
                legal: false,
                reason: `Too few cards (${size} < ${rules.min})`
            };
            return;
        }

        if (points > rules.points) {
            this.result = {
                legal: false,
                reason: `Too many points (${points} > ${rules.points})`
            };
            return;
        }

        if (dups[2] > rules.dups[2]) {
            this.result = {
                legal: false,
                reason: `Too main two-ofs (${dups[2]} > ${rules.dups[2]})`
            };
            return;
        }
        if (dups[3] > rules.dups[3]) {
            this.result = {
                legal: false,
                reason: `Too main three-ofs (${dups[3]} > ${rules.dups[3]})`
            };
            return;
        }

        return null;
    }

    _render_result(deck, elem) {
        while (elem.firstChild) {
            elem.firstChild.remove();
        }

        /* for not legal result, just render a message */
        if (this.result.legal === false) {
            var msg = document.createElement('h2');
            msg.innerText = `Not legal - ${this.result.reason}`;
            elem.appendChild(msg);
            return;
        }

        /* Show how many points used */
        var main_pts = 0;
        deck.main.forEach(card => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var card_db = this.card_db[card.name];
            main_pts += card.count * card_db.points;
        });
        var side_pts = 0;
        deck.side.forEach(card => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var card_db = this.card_db[card.name];
            side_pts += card.count * card_db.points;
        });

        var main_pts_p = document.createElement('p');
        main_pts_p.innerText = `Main board points: ${main_pts}`;
        elem.appendChild(main_pts_p);
        var side_pts_p = document.createElement('p');
        side_pts_p.innerText = `Side board points: ${side_pts}`;
        elem.appendChild(side_pts_p);

        /* render card table */
        var table = document.createElement('table');
        table.classList.add('table', 'table-striped', 'table-hover');
        elem.appendChild(table);

        var header = document.createElement('thead');
        var header_html = '<tr><th>Name</th><th>Count</th><th>Total Points</th>';
        if (this.set_limit !== Infinity) {
            header_html += '<th>Available Sets</th>';
        }
        header_html += '</tr>';
        header.innerHTML = header_html;
        table.appendChild(header);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        var render_card = (card) => {
            var card_db = this.card_db[card.name];
            if (card_db === undefined) {
                /* this is necessary for basic lands... */
                card_db = { points: 0, sets: [] };
            }

            var tr = document.createElement('tr');
            tr.addEventListener('mouseenter', () => {
                tr.classList.add('active');
            });
            tr.addEventListener('mouseleave', () => {
                tr.classList.remove('active');
            });
            tbody.appendChild(tr);

            var card_name = document.createElement('td');
            card_name.innerText = card.name;
            tr.appendChild(card_name);

            var card_count = document.createElement('td');
            card_count.innerText = card.count;
            tr.appendChild(card_count);

            var total_points = document.createElement('td');
            total_points.innerText = card.count * card_db.points;
            tr.appendChild(total_points);

            if (this.set_limit === Infinity) {
                return;
            }

            var card_sets = document.createElement('td');
            tr.appendChild(card_sets);

            Object.keys(card_db.sets).forEach(set => {
                var set_div = document.createElement('div');
                set_div.classList.add('popover');
                card_sets.appendChild(set_div);

                var set_btn = document.createElement('a');
                set_btn.classList.add('btn', 'btn-primary');
                set_btn.innerText = set.toUpperCase();
                set_btn.href = card_db.sets[set];
                set_div.appendChild(set_btn);
            });
        }

        deck.main.forEach(render_card);
        deck.side.forEach(render_card);
    }
}

class JankWalkerChecker extends DeckChecker {
    constructor(
        main = { min: 55, max: Infinity, points: 22, dups: { 2: 6, 3: 3 } },
        side = { min: 0, max: 10, points: 10, dups: { 2: 6, 3: 3 } }
    ) {
        super(JANKWALKER_DB, main, side, null);
    }
}

class JankBringerChecker extends DeckChecker {
    constructor(
        main = { min: 60, max: Infinity, points: 22, dups: { 2: 6, 3: 3 } },
        side = { min: 0, max: 10, points: 10, dups: { 2: 6, 3: 3 } },
        set_list = []
    ) {
        super(JANKBRINGER_DB, main, side, set_list);
    }
}

/**
 * @param {string} classname
 * @param {string[]} mods
 * @param {null|string[]} set_list
 * @returns {DeckChecker}
 */
function checker_factory(classname, mods, set_list) {
    var ret;

    classname = classname.toLowerCase();

    switch (classname) {
    case 'jankwalker':
        ret = new JankWalkerChecker();
        break;
    case 'jankbringer':
        ret = new JankBringerChecker();
        ret.set_list = set_list;
        break;
    default:
        throw `Invalid classname ${classname}`;
    }

    mods.forEach(mod => {
        switch (mod.toLowerCase()) {
        case 'ungabunga':
            ret.main.points += 2;
            ret.side.max = 0;
            break;

        case 'doubledown':
            ret.main.min -= 10;
            ret.main.points -= 2;
            ret.main.dups[3] = 0;
            ret.side.dups[3] = 0;
            break;

        case 'downtoone':
            ret.main.min -= 20;
            ret.main.points -= 4;
            ret.main.dups = { 2: 0, 3: 0 };
            ret.side.dups = { 2: 0, 3: 0 };
            break;

        case 'quantumenjanklement':
            ret.main.points -= 1;
            break;

        case 'newtoys':
            /* how do */
            break;

        default:
            throw `Invalid mod ${mod}`
        }
    });

    return ret;
}

async function download_sets() {
    var downloads = [
        fetch('media/basics.json'),
        fetch('media/formats.json'),
        fetch('media/jankwalker.json'),
        fetch('media/jankbringer.json')
    ];

    var docs = await Promise.all(downloads);
    var jsons = docs.map(doc => doc.json());
    var parsed = await Promise.all(jsons);

    BASIC_LANDS = parsed[0].basics;
    FORMATS = parsed[1];
    JANKWALKER_DB = parsed[2];
    JANKBRINGER_DB = parsed[3];
}

export {
    BASIC_LANDS,
    FORMATS,
    JANKWALKER_DB,
    JANKBRINGER_DB,
    DeckChecker,
    JankWalkerChecker,
    JankBringerChecker,
    checker_factory,
    download_sets
};
