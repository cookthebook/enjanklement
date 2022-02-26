/* load common navbar in pages */
var navbar = document.getElementById('JankNavbar');
navbar.classList.add('navbar');
navbar.innerHTML = `
<section class="navbar-section">
    <h1><a href="index.html">JANK!</a></h1>

    <div class="divider-vert"></div>

    <div class="popover popover-bottom">
        <button class="btn">Standard</button>
        <div class="popover-container">
            <ul class="menu">
                <li class="menu-item">
                    <a href="standard_rules.html">Rules</a>
                </li>
                <li class="menu-item">
                    <a href="standard_check.html">Deck Checker</a>
                </li>
            </ul>
        </div>
    </div>

    <div class="divider-vert"></div>

    <div class="popover popover-bottom">
        <button class="btn">Eternal</button>
        <div class="popover-container">
            <ul class="menu">
                <li class="menu-item">
                    <a href="eternal_rules.html">Rules</a>
                </li>
                <li class="menu-item">
                    <a href="eternal_list.html">Card List</a>
                </li>
                <li class="menu-item">
                    <a href="eternal_check.html">Deck Checker</a>
                </li>
            </ul>
        </div>
    </div>
</section>`;

const BASIC_LANDS = [
    'Forest', 'Mountain', 'Plains', 'Island', 'Swamp',
    'Snow-Covered Forest', 'Snow-Covered Mountain', 'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
    'Wastes'
];

class DeckChecker {
    constructor(
        card_db,
        main = { min: 40, max: Infinity, points: 15, dups: { 2: 6, 3: 0 } },
        side = { min: 0, max: 10, points: 10, dups: { 2: Infinity, 3: 0 } },
        set_limit = Infinity
    ) {
        this.card_db = card_db;
        this.main = main;
        this.side = side;
        this.set_limit = set_limit;
        this.mods = [];
        this.necessary_sets = [];
        this.possible_sets = [];
        this.permutations = [];
        this.result = {};
    }

    check(deck, out_elem) {
        this.set_list = [];
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

        if (this.set_limit !== Infinity) {
            this.set_list = this._possible_set_permutations(deck);

            if (this.set_list.length === 0) {
                this.result.legal = false;
                this.result.reason = 'Too many sets required';
                this._render_result(deck, out_elem);
                return;
            }
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

            size += card.count;

            if (BASIC_LANDS.includes(card.name)) {
                continue;
            }

            if (this.card_db[card.name] === undefined) {
                this.result = {
                    legal: false,
                    reason: `Card "${card.name}" not in legal card list`
                };
                return;
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

    _possible_set_permutations(deck) {
        var ret = [];
        var possible_sets = {};
        var cards_left = [];

        var get_necessary = (card) => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);

            /* if a card is only in one set, we need to include that set in our final result */
            if (sets.length === 1 && !ret.includes(sets[0])) {
                ret.push(sets[0]);
            }
        };

        var collect_possible_sets = (card) => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);
            var in_ret = false;

            /* this card has a necessary set, so don't include the rest in the search space */
            for (var i = 0; i < sets.length; i++) {
                if (ret.includes(sets[i])) {
                    in_ret = true;
                    break;
                }
            }
            if (in_ret) {
                return;
            }

            cards_left.push(card);
            /* the sets for this card need to be included in the search space */
            for (var i = 0; i < sets.length; i++) {
                if (possible_sets[sets[i]] === undefined) {
                    possible_sets[sets[i]] = 1;
                } else {
                    possible_sets[sets[i]]++;
                }
            }
        }

        while (true) {
            if (ret.length > this.set_limit) {
                return [];
            }

            possible_sets = {};
            cards_left = [];

            deck.main.forEach(get_necessary);
            deck.side.forEach(get_necessary);

            deck.main.forEach(collect_possible_sets);
            deck.side.forEach(collect_possible_sets);

            if (ret.length > this.set_limit) {
                return [];
            }

            if (cards_left.length === 0) {
                break;
            }

            var sets_left = Object.keys(possible_sets);
            if (sets_left.length === 0) {
                return [];
            }

            var next_set = sets_left[0];
            for (var i = 1; i < sets_left.length; i++) {
                if (possible_sets[sets_left[i]] > possible_sets[next_set]) {
                    next_set = sets_left[i];
                }
            }

            ret.push(next_set);
            console.log(`Push ${next_set} to set list (${possible_sets[next_set]} cards)`);
        }

        return ret;
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

        if (this.set_limit !== Infinity) {
            var set_list_h2 = document.createElement('h2');
            set_list_h2.innerText = 'Found Set List';
            elem.appendChild(set_list_h2);
            var set_list_p = document.createElement('p');
            set_list_p.innerText = this.set_list.map(set => set.toUpperCase()).join(', ');
            elem.appendChild(set_list_p);
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
