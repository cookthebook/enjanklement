class CardLister {
    constructor(elem, card_db = {}) {
        this.elem = elem;
        this.suggestion_elem = document.createElement('datalist');
        this.suggestion_elem.id = Math.random().toString(36);
        this.elem.appendChild(this.suggestion_elem);
        console.debug(this.suggestion_elem.id);
        this.set_card_db(card_db);
        this.card_elems = [];
        this._update();
    }

    get_card_list() {
        var ret = [];

        this.card_elems.forEach(card_elem => {
            var card = this._card_elem_to_card(card_elem);

            if (card.name !== '') {
                ret.push(card);
            }
        });

        return ret;
    }

    import(cards) {
        while (this.card_elems.length > 0) {
            this._remove_card_elem(this.card_elems[0]);
        }

        this.card_elems = [];

        cards.forEach(card => {
            console.debug('Import card', card);
            this._new_card_elem(card.name, card.count);
        });
        console.debug(this.card_elems);
        this._update();
    }

    set_card_db(card_db, basics) {
        if (!card_db || !basics) {
            return;
        }

        this.db = card_db;
        this.basics = basics;
        this.card_names = Object.keys(this.db).concat(basics);
    }

    _card_elem_to_card(card_elem) {
        return {
            name: card_elem.card_name_elem.value,
            count: card_elem.card_count_elem.value
        };
    }

    _update() {
        if (
            this.card_elems.length === 0 ||
            this._card_elem_to_card(this.card_elems[this.card_elems.length-1]).name !== ''
        ) {
            this._new_card_elem();
        }

        /* remove trailing empty cards */
        for (let i = this.card_elems.length-2; i >= 0; i--) {
            if (this._card_elem_to_card(this.card_elems[i]).name === '') {
                this._remove_card_elem(this.card_elems[i]);
            } else {
                break;
            }
        }

        /* set label numbers */
        for (let i = 0; i < this.card_elems.length; i++) {
            this.card_elems[i].card_label_elem.innerText = `${i+1}. `;
        }
    }

    _new_card_elem(name='', count=1) {
        var form_horizontal = document.createElement('form');
        form_horizontal.classList.add('form-horizontal');
        this.elem.appendChild(form_horizontal);
        this.card_elems.push(form_horizontal);
        form_horizontal.addEventListener('input', () => {
            this._update();
        });

        var form_group = document.createElement('div');
        form_group.classList.add('form-group');
        form_horizontal.appendChild(form_group);

        var card_label_div = document.createElement('div');
        card_label_div.classList.add('col-1', 'col-sm-12');
        form_group.appendChild(card_label_div);
        var card_label = document.createElement('label');
        card_label.classList.add('form-label');
        card_label_div.appendChild(card_label);
        form_horizontal.card_label_elem = card_label;

        var card_name_div = document.createElement('div');
        card_name_div.classList.add('col-9', 'col-sm-12');
        form_group.appendChild(card_name_div);
        var card_name = document.createElement('input');
        card_name.classList.add('form-input');
        card_name.type = 'text';
        card_name.placeholder = 'Card Name';
        card_name.value = name;
        card_name.addEventListener('input', () => {
            this._get_suggestions(card_name)
        })
        card_name_div.appendChild(card_name);
        form_horizontal.card_name_elem = card_name;

        var card_count_div = document.createElement('div');
        card_count_div.classList.add('col-2', 'col-sm-12');
        form_group.appendChild(card_count_div);
        var card_count = document.createElement('input');
        card_count.classList.add('form-input');
        card_count.type = 'number';
        card_count.min = 0;
        card_count.value = count;
        card_count_div.appendChild(card_count);
        form_horizontal.card_count_elem = card_count;
    }

    _remove_card_elem(card_elem) {
        this.card_elems.splice(this.card_elems.indexOf(card_elem), 1);
        card_elem.remove();
    }

    _get_suggestions(input_elem) {
        var search = fuzzysort.go(
            input_elem.value,
            this.card_names,
            { limit: 10, threshold: -10000 }
        );

        if (search === undefined || search.length === 0) {
            return;
        }

        var suggestion_html = '';
        if (search.length > 2 || search[0].target !== input_elem.value) {
            search.forEach(result => {
                suggestion_html += `<option value="${result.target}">${result.target}</option>`;
            });
        }
        this.suggestion_elem.innerHTML = suggestion_html;
        console.debug(this.suggestion_html);
        input_elem.setAttribute('list', this.suggestion_elem.id);
    }
}

export { CardLister };
