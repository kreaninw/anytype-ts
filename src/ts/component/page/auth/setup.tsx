import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router';
import { Frame, Cover, Title, Error, Button, Header, Footer } from 'Component';
import { Storage, translate, C, DataUtil, Util, analytics, Renderer } from 'Lib';
import { commonStore, authStore } from 'Store';
import { observer } from 'mobx-react';

interface Props extends RouteComponentProps<any> {};
interface State {
	index: number;
	error: string;
};

const $ = require('jquery');
const Constant = require('json/constant.json');
const Errors = require('json/error.json');

const PageAuthSetup = observer(class PageAuthSetup extends React.Component<Props, State> {

	i: number = 0;
	t: number = 0;
	state = {
		index: 0,
		error: '',
	};

	render () {
		const { cover } = commonStore;
		const { match } = this.props;
		const { error } = this.state;
		
		let title = '';
		switch (match.params.id) {
			case 'init':
				title = translate('authSetupLogin'); 
				break;

			case 'register':
			case 'add': 
				title = translate('authSetupRegister');
				break;

			case 'select': 
				title = translate('authSetupSelect');
				break;

			case 'share': 
				title = translate('authSetupShare');
				break;
		};
		
		return (
			<div>
				<Cover {...cover} className="main" />
				<Header {...this.props} component="authIndex" />
				<Footer {...this.props} component="authIndex" />
				
				<Frame>
					<Title text={title} />
					<Error text={error} />
					{error ? <Button text={translate('authSetupBack')} onClick={() => { Util.route('/'); }} /> : ''}
				</Frame>
			</div>
		);
    };

	componentDidMount () {
		const { match } = this.props;
		const node = $(ReactDOM.findDOMNode(this));
		const label = node.find('#label');
		
		this.clear();
		this.t = window.setTimeout(() => { label.show(); }, 10000);
		
		switch (match.params.id) {
			case 'init': 
				this.init(); 
				break;

			case 'register':
			case 'add': 
				this.add();
				break;

			case 'select': 
				this.select();
				break;

			case 'share': 
				this.share();
				break;
		};
	};
	
	componentWillUnmount () {
		this.clear();
	};
	
	init () {
		const { walletPath, phrase } = authStore;
		const accountId = Storage.get('accountId');

		if (!phrase) {
			return;
		};

		const setError = (message: any) => {
			if (message.error.code) {
				Util.checkError(message.error.code);
				this.setError(message.error.description);
				return true;
			};
			return false;
		};

		C.WalletRecover(walletPath, phrase, (message: any) => {
			if (setError(message)) {
				return;
			};

			DataUtil.createSession((message: any) => {
				if (setError(message)) {
					return;
				};

				if (accountId) {
					authStore.phraseSet(phrase);
					
					C.AccountSelect(accountId, walletPath, (message: any) => {
						if (setError(message)) {
							return;
						};

						if (message.account) {
							DataUtil.onAuth(message.account);
						};
					});
				} else {
					Util.route('/auth/account-select');
				};
			});
		});
	};
	
	add () {
		const { match } = this.props;
		const { walletPath, accountPath, name, icon, code } = authStore;

		commonStore.defaultTypeSet(Constant.typeId.note);

		C.WalletCreate(walletPath, (message: any) => {
			if (message.error.code) {
				this.setState({ error: message.error.description });
			} else {
				authStore.phraseSet(message.mnemonic);

				DataUtil.createSession((message: any) => {
					C.AccountCreate(name, icon, accountPath, code, (message: any) => {
						if (message.error.code) {
							const error = Errors.AccountCreate[message.error.code] || message.error.description;
							this.setError(error);
						} else
						if (message.account) {
							if (message.config) {
								commonStore.configSet(message.config, false);
							};

							const accountId = message.account.id;

							authStore.accountSet(message.account);
							authStore.previewSet('');

							Storage.set('popupNewBlock', true);

							Renderer.send('keytarSet', accountId, authStore.phrase);
							analytics.event('CreateAccount');
							
							if (match.params.id == 'register') {
								Util.route('/auth/success');
							};
								
							if (match.params.id == 'add') {
								Util.route('/auth/pin-select/add');
							};
						};
					});
				});
			};
		});
	};
	
	select () {
		const { account, walletPath } = authStore;
		
		C.AccountSelect(account.id, walletPath, (message: any) => {
			if (message.error.code) {
				Util.checkError(message.error.code);
				this.setError(message.error.description);
			} else
			if (message.account) {
				DataUtil.onAuth(message.account);
			};
		}); 
	};

	share () {
		const { location } = this.props;
		const param = Util.searchParam(location.search);

		C.ObjectAddWithObjectId(param.id, param.payload, (message: any) => {
			if (message.error.code) {
				this.setError(message.error.description);
			} else {
				Storage.set('shareSuccess', 1);
				Util.route('/main/index');
			};
		});
	};
	
	setError (v: string) {
		if (!v) {
			return;
		};
		
		this.clear();
		this.setState({ error: v });
	};
	
	clear () {
		window.clearTimeout(this.t);
	};

});

export default PageAuthSetup;