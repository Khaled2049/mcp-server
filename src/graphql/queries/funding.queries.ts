import { makeAppSyncRequest } from "../../client/appsyncClient";

const GET_STUDENT_SPEND_QUERY = `
  query GetStudentSpend(
    $guildUuid: ID!
    $employerId: ID!
    $spendAsOf: AWSDate!
    $capAsOf: AWSDate!
    $product: Funding_Product!
    $academicPartnerId: ID
    $programUuid: ID
    $achievementType: String
    $fieldOfStudyId: ID
  ) {
    funding_getStudentSpend(
      input: {
        guildUuid: $guildUuid
        employerId: $employerId
        spendAsOf: $spendAsOf
        capAsOf: $capAsOf
        product: $product
        academicPartnerId: $academicPartnerId,
        programUuid: $programUuid,
        achievementType: $achievementType,
        fieldOfStudyId: $fieldOfStudyId
      }
    ) {
      balance {
        guildUuid
        employerId
        spendAsOf
        capAsOf
        benefitPackageId
        tuitionFundingLimitCents
        amountTuitionSpentCents
        amountSpentCents
        amountRemainingCents
        expenseTypeIdsCoveredByTuitionCap
        nonTuitionExpenseTypes {
          type
          id
          fundingLimitCents
          includedInTuition
          amountSpentCents
          amountRemainingCents
        }
      }
      debug {
        fundingCapError
      }
      warnings {
        message
      }
      errors {
        message
        errorCode
      }
    }
  }
`;

interface NonTuitionExpenseType {
  type: string;
  id: string;
  fundingLimitCents: number;
  includedInTuition: boolean;
  amountSpentCents: number;
  amountRemainingCents: number;
}

interface Balance {
  guildUuid: string;
  employerId: string;
  spendAsOf: string;
  capAsOf: string;
  benefitPackageId?: string;
  tuitionFundingLimitCents: number;
  amountTuitionSpentCents: number;
  amountSpentCents: number;
  amountRemainingCents: number;
  expenseTypeIdsCoveredByTuitionCap: string[];
  nonTuitionExpenseTypes: NonTuitionExpenseType[];
}

interface Debug {
  fundingCapError?: string;
}

interface Warning {
  message: string;
}

interface AppSyncError {
  message: string;
  errorCode?: string;
}

interface GetStudentSpendResponse {
  funding_getStudentSpend: {
    balance: Balance;
    debug?: Debug;
    warnings?: Warning[];
    errors?: AppSyncError[];
  };
}

export async function fetchStudentSpend(variables: any) {
  try {
    const response = await makeAppSyncRequest<GetStudentSpendResponse>({
      endpoint: process.env.APPSYNC_GRAPHQL_ENDPOINT as string,
      token: process.env.APPSYNC_JWT_TOKEN as string,
      query: GET_STUDENT_SPEND_QUERY,
      variables,
    });

    if (response.errors) {
      console.error("GraphQL Errors:", response.errors);
    } else if (response.data?.funding_getStudentSpend.errors) {
      console.error(
        "AppSync Business Logic Errors:",
        response.data.funding_getStudentSpend.errors
      );
      console.log("Warnings:", response.data.funding_getStudentSpend.warnings);
      console.log("Debug Info:", response.data.funding_getStudentSpend.debug);
    } else {
      console.log(
        JSON.stringify(response.data?.funding_getStudentSpend.balance, null, 2)
      );
      return response.data;
    }
  } catch (error) {
    console.error("Error fetching student spend:", error);
  }
}
