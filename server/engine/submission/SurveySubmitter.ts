/**
 * SurveySubmitter.ts
 * Section 17, 21 of README specification:
 * Submits the validated page payload to the survey server, captures cookies,
 * updates current URL and referer, parses the response HTML into the next PageModel,
 * and detects any server-side validation rejections.
 */
import { SurveyClient, HttpResponse } from '../client/SurveyClient.js';
import { PageModel, PageAnswersModel } from '../questions/QuestionModel.js';
import { FormBuilder } from './FormBuilder.js';
import { PageParser } from '../parser/PageParser.js';

export interface SubmitResult {
  nextPage: PageModel;
  httpStatus: number;
  finalUrl: string;
  hasErrors: boolean;
  errors: string[];
}

export class SurveySubmitter {
  private client: SurveyClient;

  constructor(client: SurveyClient) {
    this.client = client;
  }

  public async submit(
    currentPage: PageModel,
    validatedAnswers: PageAnswersModel,
    signal?: AbortSignal
  ): Promise<SubmitResult> {
    const payload = FormBuilder.buildPostPayload(currentPage, validatedAnswers);
    const targetUrl = currentPage.form.action || currentPage.url;

    let response: HttpResponse;
    if (currentPage.form.method === 'GET') {
      const urlObj = new URL(targetUrl);
      for (const [k, v] of payload.entries()) {
        urlObj.searchParams.append(k, v);
      }
      response = await this.client.get(urlObj.toString(), {
        referer: currentPage.url,
        signal,
      });
    } else {
      response = await this.client.post(targetUrl, payload, {
        referer: currentPage.url,
        signal,
      });
    }

    const nextPage = PageParser.parse(response.html, response.url);

    return {
      nextPage,
      httpStatus: response.status,
      finalUrl: response.url,
      hasErrors: nextPage.errors.length > 0,
      errors: nextPage.errors,
    };
  }
}
