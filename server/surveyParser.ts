import * as cheerio from 'cheerio';
import { SurveyPage, SurveyQuestion, QuestionType, QuestionOption } from '../src/types.js';

export interface ParseResult {
  isCompleted: boolean;
  completionMessage?: string;
  page: SurveyPage | null;
  rawTitle?: string;
}

export function parseSurveyHtml(html: string, currentUrl: string): ParseResult {
  const $ = cheerio.load(html);

  // 1. Check if the page is already completed / submitted
  const completionText = detectCompletionScreen($);
  if (completionText) {
    return {
      isCompleted: true,
      completionMessage: completionText,
      page: null,
      rawTitle: $('title').text().trim() || 'Survey Completed'
    };
  }

  // 2. Check if this is a Confirmit survey page (e.g. confirmit.com or responsive survey engine)
  const confirmitData = extractConfirmitSurvey($, html, currentUrl);
  if (confirmitData) {
    return {
      isCompleted: false,
      page: confirmitData,
      rawTitle: confirmitData.title
    };
  }

  // 3. Check if this is a Google Forms page
  const googleFormData = extractGoogleFormsData(html, currentUrl);
  if (googleFormData) {
    return {
      isCompleted: false,
      page: googleFormData,
      rawTitle: googleFormData.title
    };
  }

  // 4. General HTML form extraction
  const generalForm = extractGeneralHtmlForm($, currentUrl);
  if (generalForm && (generalForm.questions.length > 0 || generalForm.isInfoOnlyPage)) {
    return {
      isCompleted: false,
      page: generalForm,
      rawTitle: generalForm.title
    };
  }

  // 5. Fallback if no explicit <form> tag, search for question groups in body
  const looseQuestions = extractLooseQuestions($, currentUrl);
  if (looseQuestions && (looseQuestions.questions.length > 0 || looseQuestions.isInfoOnlyPage)) {
    return {
      isCompleted: false,
      page: looseQuestions,
      rawTitle: looseQuestions.title
    };
  }

  // If nothing could be extracted, check if it looks like a completion page in text
  const bodyText = $('body').text();
  if (
    bodyText.toLowerCase().includes('thank you') &&
    (bodyText.toLowerCase().includes('response') || bodyText.toLowerCase().includes('submitted') || bodyText.toLowerCase().includes('complete') || bodyText.toLowerCase().includes('participating'))
  ) {
    return {
      isCompleted: true,
      completionMessage: 'Survey response submitted successfully. Completion text detected.',
      page: null,
      rawTitle: $('title').text().trim() || 'Survey Completed'
    };
  }

  // No questions or submittable elements found
  return {
    isCompleted: false,
    page: null,
    rawTitle: $('title').text().trim() || 'Unknown Page'
  };
}

function detectCompletionScreen($: cheerio.CheerioAPI): string | null {
  const completionIndicators = [
    'Your response has been recorded',
    'Thank you for completing this survey',
    'Thank you! Your response has been submitted',
    'Thank you for your feedback',
    'Survey completed successfully',
    'Your submission has been received',
    'Thank you for participating',
    'Responses have been saved',
    'Form submission complete',
    'You have completed the survey',
    'Thank you for your time and feedback',
    'The survey has ended'
  ];

  const fullText = $('body').text();
  for (const indicator of completionIndicators) {
    if (fullText.toLowerCase().includes(indicator.toLowerCase())) {
      return indicator;
    }
  }

  // Specific completion containers
  const confirmationHeading = $(
    '.freebirdFormviewerViewResponseConfirmationMessage, .survey-completion, .confirmation-message, #completion-message, .cf-page--complete, .completion-text'
  ).text().trim();
  if (confirmationHeading) {
    return confirmationHeading;
  }

  return null;
}

/**
 * Robust extractor for Confirmit (FirmIT / Forsta / WIX) survey pages
 */
function extractConfirmitSurvey($: cheerio.CheerioAPI, html: string, currentUrl: string): SurveyPage | null {
  const hasCfIndicators =
    html.includes('window.cfApi') ||
    html.includes('Confirmit') ||
    $('.cf-page, .cf-question, #page_form, .cf-navigation, .cf-page__main').length > 0 ||
    currentUrl.includes('/wix/');

  if (!hasCfIndicators) return null;

  const form = $('#page_form').length > 0 ? $('#page_form').first() : $('form').first();
  const formAction = form.length > 0 ? (form.attr('action') || currentUrl) : currentUrl;
  const fullAction = resolveUrl(formAction, currentUrl);
  const method = ((form.attr('method') || 'POST').toUpperCase() as 'GET' | 'POST') || 'POST';

  // Gather hidden fields (from form and .cf-page__hidden-fields)
  const hiddenFields: Record<string, string> = {};
  $('form input[type="hidden"], .cf-page__hidden-fields input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const val = $(el).attr('value') || '';
    if (name) {
      hiddenFields[name] = val;
    }
  });

  // Extract validation errors
  const validationErrors: string[] = [];
  $('.cf-error-list li, .cf-question__error:not(.cf-error-block--hidden) li, .cf-error-block:not(.cf-error-block--hidden)').each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, ' ');
    if (txt && !validationErrors.includes(txt)) {
      validationErrors.push(txt);
    }
  });
  $('[role="alert"]:not(.cf-error-block--hidden)').each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, ' ');
    if (txt && !validationErrors.includes(txt)) {
      validationErrors.push(txt);
    }
  });
  const bodyText = $('body').text();
  if (validationErrors.length === 0) {
    if (bodyText.includes('Please select an answer.')) validationErrors.push('Please select an answer.');
    if (bodyText.includes('One or more questions require further input.')) validationErrors.push('One or more questions require further input.');
  }

  const formTitle =
    $('.cf-page__survey-name').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Survey';

  const questions: SurveyQuestion[] = [];
  const processedIds = new Set<string>();

  // 1. Try parsing configuration from window.cfApi JSON in <script>
  const cfApiMatch = html.match(/new\s+window\.cfApi\(\s*(\[[\s\S]+?\])\s*,\s*(\{[\s\S]+?\})\s*\);/);
  if (cfApiMatch) {
    try {
      const parsedQuestions = JSON.parse(cfApiMatch[1]);
      if (Array.isArray(parsedQuestions)) {
        for (const qObj of parsedQuestions) {
          const qId = qObj.questionId || qObj.title || `cf_q_${questions.length}`;
          if (processedIds.has(qId)) continue;
          processedIds.add(qId);

          const rawTitle = qObj.text || qObj.title || qId;
          const cleanTitle = rawTitle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const instruction = (qObj.instruction || '').replace(/<[^>]+>/g, ' ').trim();

          const lowerCombo = (cleanTitle + ' ' + instruction + ' ' + (qObj.title || '')).toLowerCase();
          const isHiddenForLive =
            lowerCombo.includes('hidden in live') ||
            lowerCombo.includes('hidden for live') ||
            lowerCombo.includes('hidden title') ||
            lowerCombo.includes('visible only during testing') ||
            lowerCombo.includes('test question') ||
            lowerCombo.includes('testing only') ||
            lowerCombo.includes('display: none') ||
            (qObj.readOnly === true && lowerCombo.includes('test'));

          const isInfoOnly =
            qObj.nodeType === 'Info' ||
            qId.toLowerCase().startsWith('info') ||
            (!qObj.answers?.length && !qObj.values && !qObj.otherValues);

          const options: QuestionOption[] = (qObj.answers || []).map((ans: any) => ({
            id: String(ans.code),
            label: (ans.text || ans.code || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            value: String(ans.code),
          }));

          let qType: QuestionType = 'radio';
          if (isInfoOnly) {
            qType = 'info';
          } else if (qObj.nodeType === 'Multi') {
            qType = 'checkbox';
          } else if (qObj.nodeType === 'Open' || qObj.nodeType === 'OpenList') {
            qType = 'text';
          } else if (qObj.nodeType === 'Single') {
            const isScale = options.length >= 4 && options.every(o => !isNaN(Number(o.value)));
            qType = isScale ? 'scale' : 'radio';
          }

          // In Confirmit, answers often define the input field name (e.g. revision or fieldName)
          const inputName = qObj.answers?.[0]?.fieldName || qObj.fieldName || qId;

          // Check if this question has an associated error
          let qError: string | undefined = undefined;
          if (qObj.errorMessages && Array.isArray(qObj.errorMessages) && qObj.errorMessages.length > 0) {
            qError = qObj.errorMessages.join(', ');
          }

          questions.push({
            id: qId,
            title: cleanTitle || qId,
            description: instruction || undefined,
            type: qType,
            options: options.length > 0 ? options : undefined,
            inputName,
            required: qObj.required !== false && !isInfoOnly,
            isHiddenForLive,
            isInfoOnly,
            errorMessage: qError,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse window.cfApi JSON:', e);
    }
  }

  // 2. Also inspect DOM elements .cf-question to catch any not in cfApi or if cfApi regex failed
  $('.cf-question').each((idx, qEl) => {
    const el = $(qEl);
    const qId = el.attr('id') || `cf_q_${idx}`;
    if (processedIds.has(qId)) {
      // Already processed, but verify if DOM shows validation error
      const errBox = el.find('.cf-question__error:not(.cf-error-block--hidden), .cf-error-list');
      if (errBox.length > 0 && errBox.text().trim()) {
        const existing = questions.find(q => q.id === qId);
        if (existing) {
          existing.errorMessage = errBox.text().trim().replace(/\s+/g, ' ');
        }
      }
      return;
    }
    processedIds.add(qId);

    const qTitle = el.find('.cf-question__text').text().trim().replace(/\s+/g, ' ');
    const qInstruction = el.find('.cf-question__instruction').text().trim().replace(/\s+/g, ' ');
    const isInfoClass = el.hasClass('cf-question--info');
    const isMulti = el.hasClass('cf-question--multi');
    const isOpen = el.hasClass('cf-question--open') || el.hasClass('cf-question--open-list');

    const lowerCombo = (qTitle + ' ' + qInstruction + ' ' + el.text()).toLowerCase();
    const isHiddenForLive =
      lowerCombo.includes('hidden in live') ||
      lowerCombo.includes('hidden for live') ||
      lowerCombo.includes('hidden title') ||
      lowerCombo.includes('visible only during testing') ||
      lowerCombo.includes('display: none') ||
      lowerCombo.includes('display:none');

    const isInfoOnly = isInfoClass || qId.toLowerCase().startsWith('info') || (!isOpen && !isMulti && el.find('input, select, textarea').length === 0);

    const options: QuestionOption[] = [];
    el.find('.cf-checkbox-answer, .cf-radio-answer, .cf-list__item').each((_, ansEl) => {
      const ansId = $(ansEl).attr('id') || '';
      const ansText = $(ansEl).text().trim().replace(/\s+/g, ' ');
      if (ansId || ansText) {
        options.push({
          id: ansId || ansText,
          label: ansText,
          value: ansId.replace(`${qId}_`, '') || ansText,
        });
      }
    });

    let qType: QuestionType = 'radio';
    if (isInfoOnly) qType = 'info';
    else if (isMulti) qType = 'checkbox';
    else if (isOpen) qType = 'text';

    const errBox = el.find('.cf-question__error:not(.cf-error-block--hidden), .cf-error-list');
    const qError = errBox.length > 0 ? errBox.text().trim().replace(/\s+/g, ' ') : undefined;

    questions.push({
      id: qId,
      title: qTitle || qId,
      description: qInstruction || undefined,
      type: qType,
      options: options.length > 0 ? options : undefined,
      inputName: qId,
      required: !isInfoOnly,
      isHiddenForLive,
      isInfoOnly,
      errorMessage: qError,
    });
  });

  // Check if entire page is an Info Page or Hidden Page
  const isInfoOnlyPage = questions.length === 0 || questions.every(q => q.isInfoOnly);
  const isHiddenPage =
    (questions.length > 0 && questions.every(q => q.isHiddenForLive || q.isInfoOnly)) ||
    formTitle.toLowerCase().includes('hidden') ||
    formTitle.toLowerCase().includes('testing');

  // Submit button
  const submitBtn = $('.cf-navigation-next, .cf-navigation__button, button.cf-navigation-next, button[type="submit"], input[type="submit"]').first();
  const submitLabel = submitBtn.text().trim() || submitBtn.attr('value') || 'Continue';
  const isFinal =
    submitLabel.toLowerCase().includes('submit') ||
    submitLabel.toLowerCase().includes('finish') ||
    submitLabel.toLowerCase().includes('complete');

  return {
    pageIndex: 1,
    totalEstimatedPages: 1,
    title: formTitle,
    description: $('.cf-page__instruction').first().text().trim() || undefined,
    questions,
    actionUrl: fullAction,
    formMethod: method,
    hiddenFields,
    submitButtonLabel: submitLabel,
    isFinalPage: isFinal,
    isInfoOnlyPage,
    isHiddenPage,
    hasValidationErrors: validationErrors.length > 0,
    validationErrors,
  };
}

function extractGoogleFormsData(html: string, currentUrl: string): SurveyPage | null {
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.+?\]);/s);
  if (!match) return null;

  try {
    const rawData = JSON.parse(match[1]);
    const formTitle = rawData[1]?.[8] || rawData[1]?.[0] || 'Google Form';
    const formDescription = rawData[1]?.[1] || '';
    const rawQuestions = rawData[1]?.[1] || [];

    const questions: SurveyQuestion[] = [];
    const hiddenFields: Record<string, string> = {};

    let formAction = currentUrl.replace(/\/viewform.*$/, '/formResponse');
    if (!formAction.includes('/formResponse')) {
      formAction = currentUrl.split('?')[0] + '/formResponse';
    }

    if (Array.isArray(rawQuestions)) {
      for (const item of rawQuestions) {
        if (!Array.isArray(item) || item.length < 4) continue;
        const qTitle = item[1];
        const qDesc = item[2] || '';
        const qTypeNum = item[3];
        const qData = item[4];

        if (!qTitle || !Array.isArray(qData) || qData.length === 0) continue;

        const entryId = qData[0]?.[0];
        if (!entryId) continue;

        const inputName = `entry.${entryId}`;
        const rawOptions = qData[0]?.[1] || [];

        let type: QuestionType = 'text';
        const options: QuestionOption[] = [];
        let scaleMin = 1;
        let scaleMax = 5;

        if (qTypeNum === 0) {
          type = 'text';
        } else if (qTypeNum === 1) {
          type = 'textarea';
        } else if (qTypeNum === 2) {
          type = 'radio';
          for (const opt of rawOptions) {
            const val = opt[0];
            options.push({ id: val, label: val, value: val });
          }
        } else if (qTypeNum === 3) {
          type = 'select';
          for (const opt of rawOptions) {
            const val = opt[0];
            options.push({ id: val, label: val, value: val });
          }
        } else if (qTypeNum === 4) {
          type = 'checkbox';
          for (const opt of rawOptions) {
            const val = opt[0];
            options.push({ id: val, label: val, value: val });
          }
        } else if (qTypeNum === 5) {
          type = 'scale';
          scaleMin = Number(qData[0]?.[3]?.[0]) || 1;
          scaleMax = Number(qData[0]?.[3]?.[1]) || 5;
          for (let s = scaleMin; s <= scaleMax; s++) {
            options.push({ id: String(s), label: String(s), value: String(s) });
          }
        }

        const lowerTitle = (qTitle + ' ' + qDesc).toLowerCase();
        const isHiddenForLive =
          lowerTitle.includes('hidden in live') ||
          lowerTitle.includes('hidden for live') ||
          lowerTitle.includes('hidden title');

        questions.push({
          id: inputName,
          title: cleanLabel(qTitle),
          description: qDesc,
          type,
          options: options.length > 0 ? options : undefined,
          scaleMin: type === 'scale' ? scaleMin : undefined,
          scaleMax: type === 'scale' ? scaleMax : undefined,
          required: Boolean(qData[0]?.[2]),
          inputName,
          isHiddenForLive,
          isInfoOnly: false,
        });
      }
    }

    return {
      pageIndex: 1,
      totalEstimatedPages: 1,
      title: formTitle,
      description: formDescription,
      questions,
      actionUrl: formAction,
      formMethod: 'POST',
      hiddenFields,
      submitButtonLabel: 'Submit',
      isFinalPage: true,
      isInfoOnlyPage: false,
      isHiddenPage: questions.every(q => q.isHiddenForLive),
    };
  } catch (err) {
    console.error('Failed to parse Google Forms raw data:', err);
    return null;
  }
}

function extractGeneralHtmlForm($: cheerio.CheerioAPI, currentUrl: string): SurveyPage | null {
  const form = $('form').first();
  if (form.length === 0) return null;

  const action = form.attr('action') || currentUrl;
  const fullAction = resolveUrl(action, currentUrl);
  const method = (form.attr('method') || 'POST').toUpperCase() as 'GET' | 'POST';

  const formTitle =
    $('h1, .survey-title, .form-title, .cf-page__survey-name').first().text().trim() ||
    $('title').text().trim() ||
    'Online Survey';
  const formDescription = $('.survey-description, .form-description, .intro').first().text().trim() || '';

  const hiddenFields: Record<string, string> = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const val = $(el).attr('value') || '';
    if (name) {
      hiddenFields[name] = val;
    }
  });

  // Extract validation errors
  const validationErrors: string[] = [];
  $('.error, .has-error, .alert-danger, .validation-error, [role="alert"], .error-message').each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, ' ');
    if (txt && !validationErrors.includes(txt)) {
      validationErrors.push(txt);
    }
  });

  const questions: SurveyQuestion[] = [];
  const processedNames = new Set<string>();

  // Find question containers in form OR document body
  const questionContainers = $('fieldset, .question, .form-group, .survey-question, .form-item, [data-question-id]');

  if (questionContainers.length > 0) {
    questionContainers.each((index, container) => {
      const qEl = $(container);
      const qTitle = qEl.find('legend, label, .question-title, h2, h3, h4, .title').first().text().trim();
      if (!qTitle) return;

      const extracted = parseQuestionElement($, qEl, index, qTitle);
      if (extracted) {
        questions.push(extracted);
        if (extracted.inputName) processedNames.add(extracted.inputName);
      }
    });
  }

  // Scan remaining unhandled inputs in the form / body
  $('input, textarea, select').each((index, inputEl) => {
    const el = $(inputEl);
    const typeAttr = (el.attr('type') || '').toLowerCase();
    const name = el.attr('name');
    if (!name || typeAttr === 'hidden' || typeAttr === 'submit' || typeAttr === 'button') return;
    if (processedNames.has(name)) return;

    // Radio / Checkbox
    if (typeAttr === 'radio' || typeAttr === 'checkbox') {
      processedNames.add(name);
      const groupInputs = $(`input[name="${name}"]`);
      const options: QuestionOption[] = [];
      groupInputs.each((_, gEl) => {
        const val = $(gEl).attr('value') || '';
        const id = $(gEl).attr('id');
        let label = '';
        if (id) {
          label = $(`label[for="${id}"]`).text().trim();
        }
        if (!label) {
          label = $(gEl).closest('label').text().trim() || val;
        }
        options.push({ id: id || val, label: label || val, value: val });
      });

      let groupLabel =
        el.closest('fieldset').find('legend').text().trim() ||
        el.closest('.form-group, .question').find('label, h3, h4').first().text().trim() ||
        name;

      const lowerLabel = groupLabel.toLowerCase();
      const isHidden =
        lowerLabel.includes('hidden in live') ||
        lowerLabel.includes('hidden for live') ||
        lowerLabel.includes('hidden title');

      questions.push({
        id: name,
        title: cleanLabel(groupLabel),
        type: typeAttr === 'radio' ? 'radio' : 'checkbox',
        options,
        inputName: name,
        required: el.is('[required]'),
        isHiddenForLive: isHidden,
      });
      return;
    }

    if (el.is('select')) {
      processedNames.add(name);
      const options: QuestionOption[] = [];
      el.find('option').each((_, opt) => {
        const val = $(opt).attr('value') || $(opt).text().trim();
        const text = $(opt).text().trim();
        if (val) options.push({ id: val, label: text, value: val });
      });

      const label = findAssociatedLabel($, el) || name;
      const lowerLabel = label.toLowerCase();
      const isHidden =
        lowerLabel.includes('hidden in live') ||
        lowerLabel.includes('hidden for live') ||
        lowerLabel.includes('hidden title');

      questions.push({
        id: name,
        title: cleanLabel(label),
        type: 'select',
        options,
        inputName: name,
        required: el.is('[required]'),
        isHiddenForLive: isHidden,
      });
      return;
    }

    if (el.is('textarea')) {
      processedNames.add(name);
      const label = findAssociatedLabel($, el) || name;
      const lowerLabel = label.toLowerCase();
      const isHidden =
        lowerLabel.includes('hidden in live') ||
        lowerLabel.includes('hidden for live') ||
        lowerLabel.includes('hidden title');

      questions.push({
        id: name,
        title: cleanLabel(label),
        type: 'textarea',
        inputName: name,
        required: el.is('[required]'),
        isHiddenForLive: isHidden,
      });
      return;
    }

    // Standard input
    processedNames.add(name);
    const label = findAssociatedLabel($, el) || name;
    let mappedType: QuestionType = 'text';
    if (typeAttr === 'number') mappedType = 'number';
    if (typeAttr === 'email') mappedType = 'email';

    const lowerLabel = label.toLowerCase();
    const isHidden =
      lowerLabel.includes('hidden in live') ||
      lowerLabel.includes('hidden for live') ||
      lowerLabel.includes('hidden title');

    questions.push({
      id: name,
      title: cleanLabel(label),
      type: mappedType,
      inputName: name,
      required: el.is('[required]'),
      placeholder: el.attr('placeholder'),
      isHiddenForLive: isHidden,
    });
  });

  const submitBtn = $('button[type="submit"], input[type="submit"], .btn-submit, .btn-next, button:not([type="button"])').first();
  const submitLabel = submitBtn.text().trim() || submitBtn.attr('value') || 'Submit';
  const isFinal = !submitLabel.toLowerCase().includes('next') && !submitLabel.toLowerCase().includes('continue');

  // Detect Info Page (0 input questions, but has text and a submit/continue button)
  const isInfoOnlyPage = questions.length === 0;
  const isHiddenPage =
    (questions.length > 0 && questions.every(q => q.isHiddenForLive)) ||
    formTitle.toLowerCase().includes('hidden');

  return {
    pageIndex: 1,
    totalEstimatedPages: 1,
    title: formTitle,
    description: formDescription,
    questions,
    actionUrl: fullAction,
    formMethod: method,
    hiddenFields,
    submitButtonLabel: submitLabel,
    isFinalPage: isFinal,
    isInfoOnlyPage,
    isHiddenPage,
    hasValidationErrors: validationErrors.length > 0,
    validationErrors,
  };
}

function parseQuestionElement($: cheerio.CheerioAPI, qEl: cheerio.Cheerio<any>, index: number, title: string): SurveyQuestion | null {
  const lowerTitle = (title + ' ' + qEl.text()).toLowerCase();
  const isHiddenForLive =
    lowerTitle.includes('hidden in live') ||
    lowerTitle.includes('hidden for live') ||
    lowerTitle.includes('hidden title') ||
    lowerTitle.includes('display: none') ||
    lowerTitle.includes('display:none');

  const radioInputs = qEl.find('input[type="radio"]');
  if (radioInputs.length > 0) {
    const groupName = radioInputs.first().attr('name') || `q_${index}`;
    const options: QuestionOption[] = [];
    radioInputs.each((_, r) => {
      const val = $(r).attr('value') || '';
      const id = $(r).attr('id');
      let label = id ? qEl.find(`label[for="${id}"]`).text().trim() : '';
      if (!label) label = $(r).closest('label').text().trim() || val;
      options.push({ id: id || val, label: cleanLabel(label) || val, value: val });
    });

    const isScale = options.length >= 3 && options.every(o => !isNaN(Number(o.value)));
    return {
      id: groupName,
      title: cleanLabel(title),
      type: isScale ? 'scale' : 'radio',
      options,
      scaleMin: isScale ? Number(options[0].value) : undefined,
      scaleMax: isScale ? Number(options[options.length - 1].value) : undefined,
      inputName: groupName,
      required: radioInputs.first().is('[required]'),
      isHiddenForLive,
    };
  }

  const checkboxInputs = qEl.find('input[type="checkbox"]');
  if (checkboxInputs.length > 0) {
    const groupName = checkboxInputs.first().attr('name') || `q_${index}`;
    const options: QuestionOption[] = [];
    checkboxInputs.each((_, c) => {
      const val = $(c).attr('value') || '';
      const id = $(c).attr('id');
      let label = id ? qEl.find(`label[for="${id}"]`).text().trim() : '';
      if (!label) label = $(c).closest('label').text().trim() || val;
      options.push({ id: id || val, label: cleanLabel(label) || val, value: val });
    });
    return {
      id: groupName,
      title: cleanLabel(title),
      type: 'checkbox',
      options,
      inputName: groupName,
      required: checkboxInputs.first().is('[required]'),
      isHiddenForLive,
    };
  }

  const select = qEl.find('select');
  if (select.length > 0) {
    const name = select.attr('name') || `q_${index}`;
    const options: QuestionOption[] = [];
    select.find('option').each((_, o) => {
      const val = $(o).attr('value') || $(o).text().trim();
      const text = $(o).text().trim();
      if (val) options.push({ id: val, label: text, value: val });
    });
    return {
      id: name,
      title: cleanLabel(title),
      type: 'select',
      options,
      inputName: name,
      required: select.is('[required]'),
      isHiddenForLive,
    };
  }

  const textarea = qEl.find('textarea');
  if (textarea.length > 0) {
    const name = textarea.attr('name') || `q_${index}`;
    return {
      id: name,
      title: cleanLabel(title),
      type: 'textarea',
      inputName: name,
      required: textarea.is('[required]'),
      placeholder: textarea.attr('placeholder'),
      isHiddenForLive,
    };
  }

  const textInput = qEl.find('input[type="text"], input[type="email"], input[type="number"], input:not([type])');
  if (textInput.length > 0) {
    const name = textInput.attr('name') || `q_${index}`;
    const typeAttr = (textInput.attr('type') || 'text').toLowerCase();
    let qType: QuestionType = 'text';
    if (typeAttr === 'email') qType = 'email';
    if (typeAttr === 'number') qType = 'number';

    return {
      id: name,
      title: cleanLabel(title),
      type: qType,
      inputName: name,
      required: textInput.is('[required]'),
      placeholder: textInput.attr('placeholder'),
      isHiddenForLive,
    };
  }

  // If container has text but 0 input elements, treat as an info block
  const containerText = qEl.text().trim();
  if (containerText.length > 15) {
    return {
      id: `info_${index}`,
      title: cleanLabel(title),
      description: cleanLabel(containerText.slice(0, 300)),
      type: 'info',
      isInfoOnly: true,
      isHiddenForLive,
    };
  }

  return null;
}

function extractLooseQuestions($: cheerio.CheerioAPI, currentUrl: string): SurveyPage | null {
  const questions: SurveyQuestion[] = [];
  $('input[type="radio"], input[type="checkbox"], textarea, select').each((i, el) => {
    const name = $(el).attr('name');
    if (!name) return;
    if (questions.some(q => q.inputName === name)) return;

    const label = findAssociatedLabel($, $(el)) || `Question ${i + 1}`;
    const type = $(el).is('textarea') ? 'textarea' : $(el).is('select') ? 'select' : $(el).attr('type') === 'checkbox' ? 'checkbox' : 'radio';

    const lower = label.toLowerCase();
    const isHiddenForLive =
      lower.includes('hidden in live') ||
      lower.includes('hidden for live') ||
      lower.includes('hidden title');

    questions.push({
      id: name,
      title: cleanLabel(label),
      type,
      inputName: name,
      isHiddenForLive,
    });
  });

  const submitBtn = $('button, input[type="submit"], a.btn').first();
  const hasSubmit = submitBtn.length > 0;

  if (questions.length === 0 && !hasSubmit) return null;

  const isInfoOnlyPage = questions.length === 0;

  return {
    pageIndex: 1,
    totalEstimatedPages: 1,
    title: $('h1').first().text().trim() || 'Survey Questionnaire',
    questions,
    actionUrl: currentUrl,
    formMethod: 'POST',
    hiddenFields: {},
    submitButtonLabel: submitBtn.text().trim() || 'Submit',
    isFinalPage: true,
    isInfoOnlyPage,
    isHiddenPage: questions.every(q => q.isHiddenForLive),
  };
}

function findAssociatedLabel($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  const id = el.attr('id');
  if (id) {
    const labelFor = $(`label[for="${id}"]`).text().trim();
    if (labelFor) return labelFor;
  }
  const parentLabel = el.closest('label').text().trim();
  if (parentLabel) return parentLabel;

  const prevHeader = el.prevAll('h1, h2, h3, h4, label, p, .label').first().text().trim();
  if (prevHeader) return prevHeader;

  return el.closest('.form-group, .question, fieldset').find('label, legend, h3, h4').first().text().trim();
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\*$/, '')
    .trim();
}

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}
