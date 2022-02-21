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
        this.necessary_sets = [];
        this.possible_sets = [];
        this.permutations = [];
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
            this._possible_set_permutations(deck);

            if (this.permutations.length === 0) {
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
        this.necessary_sets = [];
        this.possible_sets = [];
        this.permutations = [];

        var get_necessary = (card) => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);

            if (sets.length === 1 && !this.necessary_sets.includes(sets[0])) {
                this.necessary_sets.push(sets[0]);
            }
        };

        var get_possible = (card) => {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);

            for (var i = 0; i < sets.length; i++) {
                if (this.necessary_sets.includes(sets[i])) {
                    return;
                }
            }

            sets.forEach(set => {
                if (!this.possible_sets.includes(set)) {
                    this.possible_sets.push(set);
                }
            });
        };

        deck.main.forEach(get_necessary);
        deck.side.forEach(get_necessary);
        deck.main.forEach(get_possible);
        deck.side.forEach(get_possible);

        var valid_subset = (sets) => {
            if (sets.length > this.set_limit) {
                return false;
            }

            var card_in_subset = (card) => {
                if (BASIC_LANDS.includes(card.name)) {
                    return true;
                }

                var db_card = this.card_db[card.name];
                var card_sets = Object.keys(db_card.sets);

                for (var i = 0; i < card_sets.length; i++) {
                    if (sets.includes(card_sets[i])) {
                        return true;
                    }
                }

                return false;
            }

            for (var i = 0; i < deck.main.length; i++) {
                if (!card_in_subset(deck.main[i])) {
                    return false;
                }
            }
            for (var i = 0; i < deck.side.length; i++) {
                if (!card_in_subset(deck.side[i])) {
                    return false;
                }
            }

            return true;
        };

        /* easy check on necessary sets */
        if (this.necessary_sets.length > this.set_limit) {
            return;
        }
        if (valid_subset(this.necessary_sets)) {
            this.permutations = this.necessary_sets.slice();
            return;
        }

        var power_set = (array, max_len) => {
            var ret = [[]];

            for (var i = 0; i < array.length; i++) {
                var len = ret.length;

                ret.push([i]);

                for (var j = 1; j < len; j++) {
                    if (ret[j].length >= max_len) {
                        continue;
                    }

                    ret.push(ret[j].concat([i]));
                }
            }

            return ret.map(subset => {
                return subset.map(idx => { return array[idx]; });
            });
        }

        /* Get the power set of the sets that are not necessary, only getting
         * subset that wouldn't go over the set limit. Then, check which
         * permutations fit into this deck */
        var extra_set_permutations = power_set(
            this.possible_sets,
            this.set_limit - this.necessary_sets.length
        );

        extra_set_permutations.forEach(permutation => {
            var subset = this.necessary_sets.concat(permutation);

            if (valid_subset(subset)) {
                this.permutations.push(subset);
            }
        });

        /* remove any set not in a permutation from possible sets */
        for (var i = 0; i < this.possible_sets.length; i++) {
            var in_perm = false;

            for (var j = 0; j < this.permutations.length; j++) {
                if (this.permutations[j].includes(this.possible_sets[i])) {
                    in_perm = true;
                    break;
                }
            }

            if (!in_perm) {
                this.possible_sets.splice(i, 1);
                i--;
            }
        }

        return;
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
            var nec_sets_h2 = document.createElement('h2');
            nec_sets_h2.innerText = 'Necessary Sets';
            elem.appendChild(nec_sets_h2);
            var nec_sets = document.createElement('p');
            if (this.necessary_sets.length > 0) {
                nec_sets.innerText = this.necessary_sets.map(set => set.toUpperCase()).join(', ');
            } else {
                nec_sets.innerText = 'None';
            }
            elem.appendChild(nec_sets);

            var ext_sets_h2 = document.createElement('h2');
            ext_sets_h2.innerText = 'Extra Set Options';
            elem.appendChild(ext_sets_h2);
            var ext_sets = document.createElement('p');
            if (this.possible_sets.length > 0) {
                ext_sets.innerText = this.possible_sets.map(set => set.toUpperCase()).join(', ');
            } else {
                ext_sets.innerText = 'None';
            }
            elem.appendChild(ext_sets);
        }

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

        deck.main.forEach(card => {
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
                if (!this.necessary_sets.includes(set) && !this.possible_sets.includes(set)) {
                    return;
                }

                var set_div = document.createElement('div');
                set_div.classList.add('popover');
                card_sets.appendChild(set_div);

                var set_btn = document.createElement('a');
                set_btn.classList.add('btn', 'btn-primary');
                set_btn.innerText = set.toUpperCase();
                set_btn.href = card_db.sets[set];
                set_div.appendChild(set_btn);
            });
        });
    }
}
