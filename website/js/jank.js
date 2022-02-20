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
        main={ min:40, max:Infinity, points:15, dups:{ 2:6, 3:0 } },
        side={ min:0, max:10, points:10, dups:{ 2:Infinity, 3:0 } },
        set_limit=Infinity
    ) {
        this.card_db = card_db;
        this.main = main;
        this.side = side;
        this.set_limit = set_limit;
        this.mods = [];
    }

    check(deck) {
        var ret = this._check_cards(deck.main, this.main);
        if (ret != null) {
            ret.reason = '(Main Board) ' + ret.reason;
            return ret;
        }

        ret = this._check_cards(deck.side, this.side);
        if (ret != null) {
            ret.reason = '(Side Board) ' + ret.reason;
            return ret;
        }

        if (this.set_limit !== Infinity) {
            sets_options = this._possible_set_permutations(deck);

            if (sets_options.length === 0) {
                return {
                    legal: false,
                    reason: 'Too many sets required'
                };
            }
        }

        return { legal: true };
    }

    _check_cards(cards, rules) {
        var size = 0;
        var points = 0;
        var dups = { 2:0, 3:0 };

        /* iterate through cards to tally up card counts, dups, and points */
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];

            size += card.count;

            if (BASIC_LANDS.includes(card.name)) {
                continue;
            }

            if (this.card_db[card.name] === undefined) {
                return {
                    legal: false,
                    reason: `Card "${card.name}" not in legal card list`
                };
            }

            if (card.count > 3) {
                return {
                    legal: false,
                    reason: `Too many duplicates of "${card.name}"`
                };
            }
            else if (card.count > 1) {
                dups[card.count]++;
            }

            points += card.count * (this.card_db[card.name].points);
        }

        if (size > rules.max) {
            return {
                legal: false,
                reason: `Too many cards (${size} > ${rules.max})`
            }
        }
        else if (size < rules.min) {
            return {
                legal: false,
                reason: `Too few cards (${size} < ${rules.min})`
            };
        }

        if (points > rules.points) {
            return {
                legal: false,
                reason: `Too many points (${points} > ${rules.points})`
            };
        }

        if (dups[2] > rules.dups[2]) {
            return {
                legal: false,
                reason: `Too main two-ofs (${dups[2]} > ${rules.dups[2]})`
            };
        }
        if (dups[3] > rules.dups[3]) {
            return {
                legal: false,
                reason: `Too main three-ofs (${dups[3]} > ${rules.dups[3]})`
            };
        }

        return null;
    }

    _possible_set_permutations(deck) {
        var necessary_sets = [];
        var possible_sets = [];
        var ret = [];

        function get_necessary(card) {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);

            if (sets.length === 1 && !necessary_sets.includes(sets[0])) {
                necessary_sets.push(sets[0]);
            }
        }

        function get_possible(card) {
            if (BASIC_LANDS.includes(card.name)) {
                return;
            }

            var db_card = this.card_db[card.name];
            var sets = Object.keys(db_card.sets);

            for (var i = 0; i < sets.length; i++) {
                if (necessary_sets.includes(sets[i])) {
                    return;
                }
            }

            sets.forEach(set => {
                if (!possible_sets.includes(set)) {
                    possible_sets.push(set);
                }
            });
        }

        deck.main.forEach(get_necessary);
        deck.side.forEach(get_necessary);
        deck.main.forEach(get_possible);
        deck.side.forEach(get_possible);

        function valid_subset(sets) {
            if (sets.length > this.set_limit) {
                return false;
            }

            function card_in_subset(card) {
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
        }

        /* easy check on necessary sets */
        if (necessary_sets.length > this.set_limit) {
            return [];
        }
        if (valid_subset(necessary_sets)) {
            return necessary_sets;
        }

        function power_set(array, max_len) {
            var ret = [[]];

            for (var i = 0; i < array.length; i++) {
                var len = ret.length;
                if (len > max_len) len = max_len;

                for (var x = 0; x < len; x++) {
                    ret.push(ret[x].concat(array[i]));
                }
            }

            return ret;
        }

        /* Get the power set of the sets that are not necessary, only getting
         * subset that wouldn't go over the set limit. Then, check which
         * permutations fit into this deck */
        var extra_set_permutations = power_set(
            possible_sets,
            this.set_limit - necessary_sets.length
        );

        extra_set_permutations.forEach(permutation => {
            var subset = necessary_sets.concat(permutation);

            if (valid_subset(subset)) {
                ret.push(subset);
            }
        });

        return ret;
    }
}
