

class BulkSearch {
    constructor(elem, gen_card_action=null) {
        this.elem = elem;
        this.gen_card_action = gen_card_action;
    }

    render() {
        /* loading element while downloading bulk list */
        var loading = document.createElement('div');
        loading.classList.add('loading', 'loading-lg');
        this.elem.appendChild(loading);

        async function get_db() {
            var db_resp = await fetch('/website/media/jank.json');
            var ret = await db_resp.json();
            return ret;
        }
        get_db().then(resp => {
            this.db = resp;
            loading.remove();

            var search_group = document.createElement('div');
            search_group.classList.add('form-group');
            this.elem.appendChild(search_group);


            /* letter filter field to not render all cards to the page */
            var letter_filter_label = document.createElement('label');
            letter_filter_label.classList.add('form-label');
            letter_filter_label.innerText = 'First Letter Filter';
            search_group.appendChild(letter_filter_label);

            this.letter_filter = document.createElement('select')
            this.letter_filter.classList.add('form-select');
            this.letter_filter.style.width = '5rem';
            search_group.appendChild(this.letter_filter);
            this.letter_filter.addEventListener('change', () => {
                this._render_cards(
                    this._filter_by_letter(this.letter_filter.value)
                );
            })

            /* a to z */
            for (var i = 65; i <= 90; i++) {
                var opt_elem = document.createElement('option');
                opt_elem.value = String.fromCharCode(i+32);
                opt_elem.innerText = String.fromCharCode(i);
                this.letter_filter.appendChild(opt_elem);
            }


            /* name search */
            var name_search_label = document.createElement('label');
            name_search_label.classList.add('form-label');
            name_search_label.innerText = 'Card Name Search';
            search_group.appendChild(name_search_label);

            var name_filter_group = document.createElement('div');
            name_filter_group.classList.add('input-group');
            name_filter_group.style.width = '15rem';
            search_group.appendChild(name_filter_group);

            this.name_filter = document.createElement('input');
            this.name_filter.classList.add('form-input');
            this.name_filter.type = 'text';
            this.name_filter.placeholder = 'Drake Haven';
            name_filter_group.appendChild(this.name_filter);
            this.name_filter.addEventListener('input', () => {
                this._render_cards(
                    this._filter_by_search(this.name_filter.value.trim())
                );
            })

            var name_filter_btn = document.createElement('button');
            name_filter_btn.classList.add('btn', 'btn-primary');
            name_filter_btn.innerText = 'Filter';
            name_filter_group.appendChild(name_filter_btn);
            name_filter_btn.addEventListener('click', () => {
                this._render_cards(
                    this._filter_by_search(this.name_filter.value.trim())
                );
            });


            /* actual table for displaying cards */
            var card_table = document.createElement('table');
            card_table.classList.add('table', 'table-striped', 'table-hover', 'p-centered');
            this.elem.appendChild(card_table);

            var card_thead = document.createElement('thead');
            card_table.appendChild(card_thead);
            var card_thead_tr = document.createElement('tr');
            card_thead.appendChild(card_thead_tr);
            var card_thead_name = document.createElement('th');
            card_thead_name.style.width = '25rem';
            card_thead_name.innerText = 'Name';
            card_thead_tr.appendChild(card_thead_name);
            var card_thead_points = document.createElement('th');
            card_thead_points.style.width = '5rem';
            card_thead_points.innerText = 'Points';
            card_thead_tr.appendChild(card_thead_points);

            if (this.gen_card_action !== null) {
                var card_action_col = document.createElement('th');
                card_thead_tr.appendChild(card_action_col);
            }


            this.table_body = document.createElement('tbody');
            card_table.appendChild(this.table_body);

            /* default on "a" search */
            this._render_cards(this._filter_by_letter('a'));
        });
    }



    _card_to_row(name) {
        var ret = document.createElement('tr');
        ret.addEventListener('mouseenter', () => {
            ret.classList.add('active');
        });
        ret.addEventListener('mouseleave', () => {
            ret.classList.remove('active');
        });

        var card_container = document.createElement('td');
        card_container.classList.add('popover');
        card_container.classList.add('popover-right');
        card_container.has_image_hover = false;
        ret.appendChild(card_container);
        card_container.addEventListener('mouseover', () => {
            if (card_container.has_image_hover) {
                return;
            }
            card_container.has_image_hover = true;

            var card_popover = document.createElement('img');
            card_popover.classList.add('popover-container');
            card_popover.style.width = '13rem';
            card_popover.src = this.db[name].image;
            card_container.appendChild(card_popover);
        });

        var card_name = document.createElement('a');
        card_name.innerText = name;
        card_name.href = this.db[name].uri;
        card_name.target = '_blank';
        card_name.rel = 'noopener noreferrer';
        card_container.appendChild(card_name);

        var card_points = document.createElement('td');
        card_points.innerText = this.db[name].points;
        ret.appendChild(card_points);

        if (this.gen_card_action !== null) {
            ret.appendChild(this.gen_card_action(name, this.db[name]));
        }

        return ret;
    }



    _render_cards(names) {
        while (this.table_body.childNodes.length > 0) {
            this.table_body.firstChild.remove();
        }

        names.forEach(name => {
            this.table_body.appendChild(this._card_to_row(name));
        });
    }



    _filter_by_letter(letter) {
        return Object.keys(this.db).filter(name => {
            name = name.toLocaleLowerCase();

            if (name[0] === letter) {
                return true;
            }
            else if (name[0] < 'a' && letter === 'a') {
                return true;
            }
            else if (name[0] > 'z' && letter === 'z') {
                return true;
            }
            else {
                return false;
            }
        });
    }



    _filter_by_search(search) {
        var fzy = fuzzysort.go(
            search,
            Object.keys(this.db),
            { limit: 200, threshold: -10000 }
        );

        return fzy.map(result => { return result.target; });
    }
}
