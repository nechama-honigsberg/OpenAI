import {
    Configuration,
    OpenAIApi,
    // ChatCompletionRequestMessage,
    // ChatCompletionRequestMessageRoleEnum,
    // ChatCompletionResponseMessage,
    // ChatCompletionResponseMessageRoleEnum,
    // CreateChatCompletionRequest,
} from 'openai';
import axios from 'axios';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export type TOpenaiResponse = {
    data?: any;
    message?: string;
    result?: string;
    status?: number;
};

const configuration = new Configuration({
    apiKey:
        process.env.OPENAI_API_KEY 
});

const openai = new OpenAIApi(configuration);

// This generic function sends a request to the OpenAI API using the model and optional data it receives
const sendOpenaiRequest = async function (functionName: string, options: any) {
    console.log(
        `\nsendOpenaiRequest -- functionName: ${functionName} -- options: ${JSON.stringify(
            options
        )} starting......`
    );
    let _openaiResponse: TOpenaiResponse = {};

    try {
        const response = await openai[functionName](options);

        _openaiResponse = {
            status: response.status,
            data: response,
            result:
                response?.data?.choices?.[0]?.text ||
                response?.data?.data ||
                '',
        };
    } catch (error) {
        if (error?.response) {
            _openaiResponse = {
                status: error?.response?.status,
                data: error?.response?.data,
            };
        } else {
            _openaiResponse = {
                status: 500,
                data: error?.message,
                message: 'An error occurred during your request.',
            };
        }
    }
    console.log(
        `\nsendOpenaiRequest -- functionName: ${functionName} -- options: ${JSON.stringify(
            options
        )} ENDED with status:......${_openaiResponse.status}`
    );
    return _openaiResponse;
};

// This generic function sends a request with files to the OpenAI API
const sendOpenaiRequestWithFS = async function (
    functionName: string,
    requestParams: any
) {
    console.log(
        `\nsendOpenaiRequest -- functionName: ${functionName} -- options: ${JSON.stringify(
            requestParams
        )} starting......`
    );
    let _openaiResponse: TOpenaiResponse = {};
    try {
        const response = await openai[functionName](
            requestParams.file,
            requestParams.model,
            requestParams.options[0],
            requestParams.options[1],
            requestParams.options[2],
            requestParams.options[3] && requestParams.options[3]
        );

        _openaiResponse = {
            status: response.status,
            data: response,
            result: response?.data?.data || '',
        };
    } catch (error) {
        if (error?.response) {
            _openaiResponse = {
                status: error?.response?.status,
                data: error?.response?.data,
            };
        } else {
            _openaiResponse = {
                status: 500,
                data: error?.message,
                message: 'An error occurred during your request.',
            };
        }
    }
    console.log(
        `\nsendOpenaiRequest -- functionName: ${functionName} -- options: ${JSON.stringify(
            requestParams
        )} ENDED with status:......${_openaiResponse.status}`
    );
    return _openaiResponse;
};

// Completions
/**
 *
 * reference: https://platform.openai.com/docs/guides/gpt/completions-api
 * CreateCompletionRequest
 * CreateCompletionResponse
 *
 */
export type TOpenaiCompletionRequestOptions = {
    best_of?: number;
    echo?: boolean;
    frequency_penalty?: number;
    logit_bias?: Map<string, number>;
    logprobs?: number;
    max_tokens?: number;
    n?: number;
    presence_penalty?: number;
    stop?: string | [];
    stream?: boolean;
    suffix?: string;
    temperature?: number;
    top_p?: number;
    user?: string;
};

export type TOpenaiCreateCompletionRequest = {
    model: string;
    options?: TOpenaiCompletionRequestOptions;
    prompt: string | [];
};

export type TOpenaiCompletionResponse = {
    config: any;
    data: TOpenaiDataCompletionResponse;
    headers: any;
    request: any;
    status: number;
    statusText: string;
};

export type TOpenaiDataCompletionResponse = {
    choices: TOpenaiCompletionResponseSingleChoice[];
    created: number;
    id: string;
    model: string;
    object: string;
    usage: TOpenaiCompletionResponseUsage;
};

export type TOpenaiCompletionResponseSingleChoice = {
    finish_reason: string;
    index: number;
    logprobs: number | null;
    text: string;
};

export type TOpenaiCompletionResponseUsage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
};

export const sendOpenaiTextCompletionRequest = async function (
    prompt: string | [],
    options?: TOpenaiCompletionRequestOptions
): Promise<TOpenaiCompletionResponse> {
    const defaultOptions = {
        temperature: 0.6,
        max_tokens: 356,
    };

    const openaiTextCompletionRequestOptions: TOpenaiCreateCompletionRequest = {
        model: 'text-davinci-003',
        prompt,
        ...defaultOptions,
        ...options,
    };
    const response = await sendOpenaiRequest(
        'createCompletion',
        openaiTextCompletionRequestOptions
    );
    return response.data;
};

// Create image
/**
 * reference: https://platform.openai.com/docs/guides/images/introduction
 * CreateImageRequest
 * CreateImageResponse
 */

export type TOpenaiCreateImageRequest = {
    options?: TOpenaiCreateImageRequestOptions;
    prompt: string;
};

export type TOpenaiCreateImageRequestOptions = {
    n?: number;
    response_format?: string;
    size?: string;
    user?: string;
};

export type TOpenaiCreateImageResponse = {
    config: any;
    data: TOpenaiCreateImageDataResponse;
    headers: any;
    request: any;
    status: number;
    statusText: string;
};

export type TOpenaiCreateImageDataResponse = {
    created: number;
    data: TOpenaiCreateImageArrayDataResponse[];
};

export type TOpenaiCreateImageArrayDataResponse = {
    url: string;
};

export const sendOpenaiImageGenerationRequest = async function (
    prompt: string,
    options?: TOpenaiCreateImageRequestOptions
): Promise<TOpenaiCreateImageResponse> {
    const defaultOptions = {
        n: 2,
        size: '1024x1024',
    };

    const openaiImageGenerationRequestOptions: TOpenaiCreateImageRequest = {
        prompt,
        ...defaultOptions,
        ...options,
    };

    const response = await sendOpenaiRequest(
        'createImage',
        openaiImageGenerationRequestOptions
    );

    response.data.data.data.forEach(async (item, index = 0) => {
        const imageUrl = item.url;
        const imageBuffer = await downloadImage(imageUrl);
        saveImageLocally(imageBuffer, index);
    });

    return response.data;
};

async function downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
    });
    return response.data;
}

function saveImageLocally(imageBuffer: Buffer, index): string {
    const fileName = 'image' + index + '.jpg';
    const filePath = path.join('.', fileName);
    fs.writeFileSync(filePath, imageBuffer);
    return filePath;
}

// Create transcription
/**
 *
 * reference: https://platform.openai.com/docs/guides/speech-to-text
 * CreateTranscriptionRequest
 * CreateTranscriptionResponse
 *
 */

export type TOpenaiTranscriptionRequestOptions = {
    language?: string;
    prompt?: string;
    response_format?: string;
    temperature?: number;
};

export type TOpenaiTranscriptionDataRequest = {
    file: fs.ReadStream; //base64
    model: string;
    options?: TOpenaiTranscriptionMergedOptionsRequest;
};

export type TOpenaiTranscriptionRequest = {
    file: string;
    options?: TOpenaiTranscriptionRequestOptions;
};

export type TOpenaiTranscriptionMergedOptionsRequest = [
    string,
    string,
    number,
    string?
];

export type TOpenaiTranscriptionResponse = {
    status: number;
    statusText: string;
    headers: any;
    config: any;
    request: any;
    data: { text: string };
};

export const sendOpenaiCreateTranscriptionRequest = async function (
    file: string,
    options?: TOpenaiTranscriptionRequestOptions
): Promise<TOpenaiTranscriptionResponse> {
    // / Read the audio file
    const audioFile: fs.ReadStream = fs.createReadStream(file);

    const mergedOptions: TOpenaiTranscriptionMergedOptionsRequest = [
        (options && options.prompt) || 'Your optional prompt text',
        (options && options.response_format) || 'json',
        (options && options.temperature) || 0.5,
    ];

    if (options && options.language) {
        mergedOptions.push(options.language);
    }

    const requestParams: TOpenaiTranscriptionDataRequest = {
        file: audioFile,
        model: 'whisper-1',
        options: mergedOptions,
    };
    const response = await sendOpenaiRequestWithFS(
        'createTranscription',
        requestParams
    );

    return response.data;
};

export type TOpenaiEditRequestOptions = {
    n?: number;
    temperature?: number;
    top_p?: number;
};

export type TOpenaiEditRequest = {
    input: string | '';
    instruction: string;
    model: string;
    options?: TOpenaiEditRequestOptions;
};

export type TOpenaiEditResponse = {
    config: any;
    data: TOpenaiDataEditResponse;
    headers: any;
    request: any;
    status: number;
    statusText: string;
};

export type TOpenaiDataEditResponse = {
    choices: TOpenaiEditResponseSingleChoice[];
    created: number;
    object: string;
    usage: TOpenaiEditResponseUsage;
};

export type TOpenaiEditResponseSingleChoice = {
    index: number;
    text: string;
};

export type TOpenaiEditResponseUsage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
};

export const sendOpenaiEditRequest = async function (
    instruction: string,
    input: string = '',
    options?: TOpenaiEditRequestOptions
): Promise<TOpenaiEditResponse> {
    const defaultOptions = {
        temperature: 1,
    };

    const OpenaiEditRequestOptions: TOpenaiEditRequest = {
        model: 'text-davinci-edit-001', //code-davinci-edit-001
        instruction,
        input,
        ...defaultOptions,
        ...options,
    };
    const response = await sendOpenaiRequest(
        'createEdit',
        OpenaiEditRequestOptions
    );

    return response.data;
};

// Fine-tune
// Create fine-tune
export const sendOpenaiCreateFineTuneRequest = async function (
    training_file: string,
    options?: any
) {
    //     // The defaultOptions object is defined with the default values for each option.
    //     const defaultOptions = {
    //         model: "curie",
    //     };
    //     // The mergedOptions object is created by merging the defaultOptions with the provided options.
    //     // This ensures that the default values are used only for the options that are not explicitly provided.
    //     const mergedOptions = { ...defaultOptions, ...options };
    //     // return sendOpenaiRequest('createFineTune', undefined, { training_file, ...mergedOptions });
};

// Upload File
// export const sendOpenaiUploadFileRequest = async function () {
//     export const sendOpenaiUploadFileRequest = async function (fileName: string) {
//     // export const sendOpenaiUploadFileRequest = async function (fileName: string, purpose: string) {
//     // const fileOptions = {
//     //     file: fileName,
//     //     purpose: purpose,
//     // };
//     let _openaiResponse: TOpenaiResponse = {};

//     try {

//         const response = await openai.createFile(
//             fs.createReadStream(fileName),
//             "fine-tune"
//         )

//         _openaiResponse = {
//             status: response.status,
//             data: response,
//             // result: response?.data
//         };
//     } catch (error) {
//         if (error?.response) {
//             _openaiResponse = {
//                 status: error?.response?.status,
//                 data: error?.response?.data,
//             };
//         } else {
//             _openaiResponse = {
//                 status: 500,
//                 data: error?.message,
//                 message: 'An error occurred during your request.',
//             };
//         }
//     }
//     // const options = fs.createReadStream("mydata.jsonl")
//     //     "fine-tune"

//     // return sendOpenaiRequest('createFile', undefined, fileOptions);
// };

/**
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// Chat

/**
 * reference: https://platform.openai.com/docs/guides/gpt/chat-completions-api
 *
 */
export type TOpenaiCreateChatCompletionRequest = {
    functions?: TOpenaiChatRequestFunction[];
    messages: TOpenaiChatRequestUserMessage[];
    model: string;
    options?: TOpenaiChatRequestOptions;
};

export enum EOpenaiChatRequestMessageRoles {
    ROLE_SYSTEM = 'system',
    ROLE_USER = 'user',
    ROLE_ASSISTANT = 'assistant',
}

export type TOpenaiChatRequestUserMessage = {
    content: string;
    function_call?: TOpenaiChatRequestFunction[];
    name?: string;
    role: EOpenaiChatRequestMessageRoles;
};

export type TOpenaiChatRequestFunctionParameters = {
    type: object;
    properties?: any;
};

export type TOpenaiChatRequestFunction = {
    description?: string;
    name: string;
    parameters: TOpenaiChatRequestFunctionParameters[];
};

export type TOpenaiChatRequestOptions = {
    frequency_penalty?: number;
    function_call?: TOpenaiChatRequestFunction[];
    logit_bias?: Map<string, number>;
    max_tokens?: number;
    n?: number;
    presence_penalty?: number;
    stop?: string | [];
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    user?: string;
};

export type TOpenaiChatResponse = {
    config: any;
    data: TOpenaiChatCompletionResponse;
    headers: any;
    request: any;
    status: number;
    statusText: string;
};

export type TOpenaiChatCompletionResponseUsage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
};

export type TOpenaiChatCompletionResponseSingleChoiceMessage = {
    content: string;
    role: string;
};

export type TOpenaiChatCompletionResponseSingleChoice = {
    finish_reason: string;
    index: number;
    message: TOpenaiChatCompletionResponseSingleChoiceMessage;
};

export type TOpenaiChatCompletionResponse = {
    choices: TOpenaiChatCompletionResponseSingleChoice[];
    created: number;
    id: string;
    model: string;
    object: string;
    usage: TOpenaiChatCompletionResponseUsage;
};

export const sendOpenaiChatRequest = async function (
    userMessages: TOpenaiChatRequestUserMessage[],
    userFunctions?: TOpenaiChatRequestFunction[],
    options?: TOpenaiChatRequestOptions
): Promise<TOpenaiChatResponse> {
    if (!userMessages || userMessages.length < 1) return;
    // todo: check if messages have content and role, but (maybe) it is on the message creator function
    const defaultOptions = {
        temperature: 0.6,
    };

    const chatCompletionRequestOptions: TOpenaiCreateChatCompletionRequest = {
        model: 'gpt-3.5-turbo', //'gpt-4-0613', //'gpt-4', //'gpt-3.5-turbo',
        messages: userMessages,
        functions: userFunctions,
        ...defaultOptions,
        ...options,
    };

    const response = await sendOpenaiRequest(
        'createChatCompletion',
        chatCompletionRequestOptions
    );

    return response.data;
};

const main = async () => {
    const respOpenaiImageGeneration: TOpenaiCreateImageResponse =
        await sendOpenaiImageGenerationRequest(
            'draw a modern art green grass orange sun and blue ocean '
        );
    console.log(
        'TOpenaiImageGenerationResponse:',
        respOpenaiImageGeneration.data.data
    );

    const respOpenaiTextCompletion: TOpenaiCompletionResponse =
        await sendOpenaiTextCompletionRequest('this is a letter for my mom');
    console.log(
        'respOpenaiTextCompletion:',
        respOpenaiTextCompletion.data.choices
    );
    // const respOpenaiTranscription: TOpenaiTranscriptionResponse =
    //     await sendOpenaiCreateTranscriptionRequest(
    //         '/Users/USER/Desktop/file/example.mp3'
    //     );
    // console.log('respOpenaiTranscription:', respOpenaiTranscription.data);

    const respOpenaiEdit: TOpenaiEditResponse = await sendOpenaiEditRequest(
        'Fix the spelling mistakes',
        'What day of the wek is it?'
    );
    console.log('respOpenaiEdit:', respOpenaiEdit.data);

    const chat = await sendOpenaiChatRequest([
        {
            role: EOpenaiChatRequestMessageRoles.ROLE_SYSTEM,
            content:
                'You are a physician who like to tell stories who is also a rapper',
        },
        {
            role: EOpenaiChatRequestMessageRoles.ROLE_USER,
            content: 'how much is 1+1 and why? ',
        },
    ]);
    const respOpenaiChatCompletion: TOpenaiChatCompletionResponse = chat?.data;
    console.log(
        'TOpenaiChatCompletionResponse:',
        JSON.stringify(respOpenaiChatCompletion)
    );
};

main();
