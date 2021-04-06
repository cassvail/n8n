import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function webflowApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let options: OptionsWithUri = {
		headers: {
			'accept-version': '1.0.0',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.webflow.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('webflowApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers!['authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'webflowOAuth2Api', options);
		}
	} catch (error) {
		if (error.response.body.err) {
			let errorMessage = error.response.body.err;
			if (error.response.body.problems) {
				errorMessage = error.response.body.problems.join('|');
			}
			throw new Error(`Webflow Error: [${error.statusCode}]: ${errorMessage}`);
		}
		return error;
	}
}

export async function webflowApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await webflowApiRequest.call(this, method, endpoint, body, query);
		if (responseData.offset !== undefined) {
			query.offset += query.limit;
		}
		returnData.push.apply(returnData, responseData.items);
	} while (
		returnData.length < responseData.total
	);

	return returnData;
}

