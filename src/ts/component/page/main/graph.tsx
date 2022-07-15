import * as React from 'react';
import { I, C, Util, analytics } from 'ts/lib';
import { RouteComponentProps } from 'react-router';
import { Header, Graph, Icon, Loader } from 'ts/component';
import { blockStore, detailStore } from 'ts/store';
import { observer } from 'mobx-react';

import Panel from './graph/panel';

interface Props extends RouteComponentProps<any> {
	rootId: string;
	isPopup?: boolean;
	matchPopup?: any;
};

interface State {
	loading: boolean;
};

const Constant = require('json/constant.json');
const $ = require('jquery');

const PageMainGraph = observer(class PageMainGraph extends React.Component<Props, State> {

	state = {
		loading: false,
	};
	data: any = {
		nodes: [],
		edges: [],
	};
	refHeader: any = null;
	refGraph: any = null;
	refPanel: any = null;

	constructor (props: any) {
		super(props);

		this.onSwitch = this.onSwitch.bind(this);
		this.onClickObject = this.onClickObject.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.togglePanel = this.togglePanel.bind(this);
	};

	render () {
		const { loading } = this.state;
		const { isPopup } = this.props;
		const rootId = this.getRootId();
		const ref = this.refGraph;

		return (
			<div className="body">
				<Header component="mainGraph" ref={(ref: any) => { this.refHeader = ref; }} {...this.props} rootId={rootId} />

				{loading ? <Loader id="loader" /> : ''}

				<div className="wrapper">
					<div className="side left">
						<Graph 
							key="graph"
							{...this.props} 
							ref={(ref: any) => { this.refGraph = ref; }} 
							rootId={rootId} 
							data={this.data}
							onClick={this.onClickObject}
						/>
					</div>

					<div id="sideRight" className="side right">
						{ref ? (
							<Panel
								key="panel"
								{...this.props} 
								ref={(ref: any) => { this.refPanel = ref; }}
								data={ref.forceProps}
								onFilterChange={this.onFilterChange}
								onSwitch={this.onSwitch}
								togglePanel={this.togglePanel}
							/>
						) : ''}
					</div>
				</div>

				<div id="footer" className="footer">
					<Icon className="manager" onClick={() => { this.togglePanel(true); }} />
				</div>
			</div>
		);
	};

	componentDidMount () {
		this.resize();
		this.load();
	};

	componentDidUpdate () {
		this.resize();
	};

	load () {
		const filters: any[] = [
			{ operator: I.FilterOperator.And, relationKey: 'isHidden', condition: I.FilterCondition.Equal, value: false },
			{ operator: I.FilterOperator.And, relationKey: 'isArchived', condition: I.FilterCondition.Equal, value: false },
			{ operator: I.FilterOperator.And, relationKey: 'isDeleted', condition: I.FilterCondition.Equal, value: false },
			{ 
				operator: I.FilterOperator.And, relationKey: 'type', condition: I.FilterCondition.NotIn, 
				value: [ 
					Constant.typeId.relation,
					Constant.typeId.type,
					Constant.typeId.template,
					Constant.typeId.space,
					
					Constant.typeId.file,
					Constant.typeId.image,
					Constant.typeId.video,
					Constant.typeId.audio,
				] 
			},
			{ 
				operator: I.FilterOperator.And, relationKey: 'id', condition: I.FilterCondition.NotIn, 
				value: [
					'_anytype_profile',
					blockStore.profile,
				] 
			},
		];

		this.setState({ loading: true });

		C.ObjectGraph(filters, 0, [], Constant.defaultRelationKeys.concat([ 'links' ]), (message: any) => {
			if (message.error.code) {
				return;
			};

			this.data.edges = message.edges.filter(d => { return (d.source !== d.target); });
			this.data.nodes = message.nodes.map(it => detailStore.check(it));
			this.refGraph.init();

			window.setTimeout(() => { this.setState({ loading: false }); }, 250);
		});
	};

	resize () {
		const win = $(window);
		const obj = Util.getPageContainer(this.props.isPopup);
		const wrapper = obj.find('.wrapper');
		const hh = Util.sizeHeader();
		const platform = Util.getPlatform();
		const isPopup = this.props.isPopup && !obj.hasClass('full');
		
		let wh = isPopup ? obj.height() - hh : win.height();
		let sh = isPopup ? obj.height() : win.height();

		if (platform == I.Platform.Windows) {
			wh += 30;
		};

		wrapper.css({ height: wh });
		wrapper.find('.side').css({ height: sh });
		
		if (isPopup) {
			const element = $('#popupPage .content');
			if (element.length) {
				element.css({ minHeight: 'unset', height: '100%' });
			};
		};

		if (this.refGraph) {
			this.refGraph.resize();
		};
		if (this.refPanel) {
			this.refPanel.resize();
		};
	};

	togglePanel (v: boolean) {
		const { isPopup } = this.props;
		const container = Util.getPageContainer(isPopup);
		const wrapper = container.find('.wrapper');

		v ? wrapper.addClass('withPanel') : wrapper.removeClass('withPanel');
	};

	onClickObject (object: any) {
		this.togglePanel(true);
		this.refPanel.setState({ view: I.GraphView.Preview, rootId: object.id });

		analytics.event('GraphSelectNode');
	};

	getRootId () {
		const { rootId, match } = this.props;
		return rootId ? rootId : match.params.id;
	};

	onSwitch (id: string, v: any) {
		this.refGraph.forceProps[id] = v;
		this.refGraph.updateProps();

		analytics.event('GraphSettings', { id });
	};

	onFilterChange (v: string) {
		this.refGraph.forceProps.filter = v ? new RegExp(Util.filterFix(v), 'gi') : '';
		this.refGraph.updateProps();

		analytics.event('SearchQuery', { route: 'ScreenGraph', length: v.length });
	};

});

export default PageMainGraph;