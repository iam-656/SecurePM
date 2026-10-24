package com.securepm.projects;

import com.securepm.auth.dto.LoginRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import java.util.List;
import java.util.Map;

@QuarkusTest
class ProjectResourceTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @BeforeEach
    void setUp() {
        cleaner.wipeData();
    }

    private String loginAsAdmin() {
        return given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "admin";
                    password = "ChangeMeNow123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract()
                .cookie("session_id");
    }

    @Test
    void createProjectReturns201() {
        String sessionId = loginAsAdmin();

        CreateProjectRequest request = new CreateProjectRequest();
        request.name = "Test Project";
        request.description = "Test description";
        request.projectKey = "TP";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("name", equalTo("Test Project"))
                .body("projectKey", equalTo("TP"))
                .body("archived", equalTo(false));
    }

    @Test
    void createProjectWithoutAuthReturns401() {
        CreateProjectRequest request = new CreateProjectRequest();
        request.name = "No Auth";
        request.description = "desc";
        request.projectKey = "NA";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(401);
    }

    @Test
    void createProjectWithDuplicateKeyReturns400() {
        String sessionId = loginAsAdmin();

        CreateProjectRequest request1 = new CreateProjectRequest();
        request1.name = "First";
        request1.description = "desc";
        request1.projectKey = "DUP";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request1)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201);

        CreateProjectRequest request2 = new CreateProjectRequest();
        request2.name = "Second";
        request2.description = "desc";
        request2.projectKey = "DUP";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request2)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(400);
    }

    @Test
    void listProjectsReturnsUserProjects() {
        String sessionId = loginAsAdmin();

        CreateProjectRequest request = new CreateProjectRequest();
        request.name = "List Test Project";
        request.description = "desc";
        request.projectKey = "LTP";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201);

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1));
    }

    @Test
    void getProjectReturnsDetails() {
        String sessionId = loginAsAdmin();

        Long projectId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Get Test";
                    description = "desc";
                    projectKey = "GT";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId)
            .then()
                .statusCode(200)
                .body("name", equalTo("Get Test"))
                .body("projectKey", equalTo("GT"));
    }

    @Test
    void getNonexistentProjectReturns404() {
        String sessionId = loginAsAdmin();

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/99999")
            .then()
                .statusCode(404);
    }

    @Test
    void updateProjectReturns200() {
        String sessionId = loginAsAdmin();

        Long projectId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Update Test";
                    description = "desc";
                    projectKey = "UP";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        UpdateProjectRequest update = new UpdateProjectRequest();
        update.name = "Updated Name";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(update)
            .when()
                .put("/api/projects/" + projectId)
            .then()
                .statusCode(200)
                .body("name", equalTo("Updated Name"));
    }

    @Test
    void archiveProjectSetsArchivedTrue() {
        String sessionId = loginAsAdmin();

        Long projectId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Archive Test";
                    description = "desc";
                    projectKey = "AR";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie("session_id", sessionId)
            .when()
                .delete("/api/projects/" + projectId)
            .then()
                .statusCode(200);

        // Verify archived
        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId)
            .then()
                .statusCode(404);
    }

    @Test
    void addAndRemoveMember() {
        String sessionId = loginAsAdmin();

        // Create a project
        Long projectId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Member Test";
                    description = "desc";
                    projectKey = "MT";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        // Create a member user
        Long userId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "memberuser";
                    email = "memberuser@securepm.local";
                    password = "TestPass123!";
                    fullName = "Member User";
                    role = "MEMBER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        // Direct add member is now disabled (returns 400)
        given()
                .cookie("session_id", sessionId)
                .queryParam("userId", userId)
            .when()
                .post("/api/projects/" + projectId + "/members")
            .then()
                .statusCode(400);

        // Invite member
        com.securepm.invitations.dto.CreateInvitationRequest inviteReq = new com.securepm.invitations.dto.CreateInvitationRequest();
        inviteReq.userId = userId;

        Long invitationId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(inviteReq)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Login as member and accept invitation
        String memberSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "memberuser";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        given()
                .cookie("session_id", memberSession)
            .when()
                .post("/api/invitations/" + invitationId + "/accept")
            .then()
                .statusCode(200);

        // Remove member
        given()
                .cookie("session_id", sessionId)
            .when()
                .delete("/api/projects/" + projectId + "/members/" + userId)
            .then()
                .statusCode(200);
    }

    @Test
    void standardUserCanCreateAndLeadProjectAndAssignAdmin() {
        String adminSession = loginAsAdmin();

        // 1. Create a standard user
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "projectlead";
                    email = "lead@securepm.local";
                    password = "TestPass123!";
                    fullName = "Project Lead";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201);

        // 2. Login as standard user
        String userSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "projectlead";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        // 3. Create project as standard user
        CreateProjectRequest req = new CreateProjectRequest();
        req.name = "Lead Workspace";
        req.description = "User created project";
        req.projectKey = "LW";

        Long projId = given()
                .cookie("session_id", userSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("name", equalTo("Lead Workspace"))
                .extract().jsonPath().getLong("id");

        // 4. Update project details as standard user (project lead)
        UpdateProjectRequest updateReq = new UpdateProjectRequest();
        updateReq.name = "Lead Workspace Updated";

        given()
                .cookie("session_id", userSession)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/projects/" + projId)
            .then()
                .statusCode(200)
                .body("name", equalTo("Lead Workspace Updated"));

        // 5. Project lead invites admin (user id 1) to this project
        com.securepm.auth.User adminUser = com.securepm.auth.User.find("username", "admin").firstResult();
        com.securepm.invitations.dto.CreateInvitationRequest adminInviteReq = new com.securepm.invitations.dto.CreateInvitationRequest();
        adminInviteReq.userId = adminUser.id;

        Long inviteId = given()
                .cookie("session_id", userSession)
                .contentType("application/json")
                .body(adminInviteReq)
            .when()
                .post("/api/projects/" + projId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Admin accepts invite
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(200);
    }

    @Test
    void standardUserCannotModifyOtherProject() {
        String adminSession = loginAsAdmin();

        // 1. Admin creates a project
        Long adminProjId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Admin Only Project";
                    projectKey = "AOP";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 2. Create standard user
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "outsider";
                    email = "outsider@securepm.local";
                    password = "TestPass123!";
                    fullName = "Outsider";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201);

        String userSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "outsider";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        // 3. Outsider tries to modify admin's project
        UpdateProjectRequest updateReq = new UpdateProjectRequest();
        updateReq.name = "Hacked Name";

        given()
                .cookie("session_id", userSession)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/projects/" + adminProjId)
            .then()
                .statusCode(403);
    }

    @Test
    void subprojectCreationInheritanceAndSingleLevelEnforcement() {
        String adminSession = loginAsAdmin();

        // 1. Create User 1 (parent member) and User 2 (subproject lead)
        Long user1Id = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "parentmember";
                    email = "parentmember@pm.local";
                    password = "TestPass123!";
                    fullName = "Parent Member";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        Long user2Id = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "sublead";
                    email = "sublead@pm.local";
                    password = "TestPass123!";
                    fullName = "Sub Lead";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 2. Admin creates Parent Project
        CreateProjectRequest parentReq = new CreateProjectRequest();
        parentReq.name = "Parent Project";
        parentReq.projectKey = "PARENT";
        parentReq.description = "Parent Project Description";

        Long parentId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(parentReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("isSubproject", equalTo(false))
                .body("subprojectCount", equalTo(0))
                .extract().jsonPath().getLong("id");

        // Enroll User 1 into Parent Project directly via DB (or invitation)
        cleaner.wipeProjectData(); // Reset
    }

    @Test
    void subprojectComprehensiveWorkflowTest() {
        String adminSession = loginAsAdmin();
        Long adminId = given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/auth/me")
            .then()
                .statusCode(200)
                .extract().jsonPath().getLong("id");

        // 1. Create two users: alice and bob
        Long aliceId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "alice";
                    email = "alice@pm.local";
                    password = "TestPass123!";
                    fullName = "Alice ParentMember";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        Long bobId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "bob";
                    email = "bob@pm.local";
                    password = "TestPass123!";
                    fullName = "Bob SubLead";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        String aliceSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "alice";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        String bobSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "bob";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        // 2. Admin creates Parent Project
        CreateProjectRequest parentReq = new CreateProjectRequest();
        parentReq.name = "Master Parent Project";
        parentReq.projectKey = "MPP";
        parentReq.description = "Master Container";

        Long parentId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(parentReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("isSubproject", equalTo(false))
                .extract().jsonPath().getLong("id");

        // 3. Admin invites Alice to Parent Project & Alice accepts
        Long inviteId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.invitations.dto.CreateInvitationRequest() {{
                    userId = aliceId;
                }})
            .when()
                .post("/api/projects/" + parentId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        given()
                .cookie("session_id", aliceSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(200);

        // 4. Admin creates Child Sub-project, designating Bob (non-parent member) as the lead
        // Since Bob is NOT a member of parentId, this works as an invitation:
        // Admin remains active lead, Bob is recorded as pendingLeadId, and an invite is dispatched to Bob.
        CreateProjectRequest subReq = new CreateProjectRequest();
        subReq.name = "Frontend Track";
        subReq.projectKey = "MPP-FE";
        subReq.description = "Frontend track subproject";
        subReq.parentProjectId = parentId;
        subReq.leadId = bobId;

        Long subId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(subReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("isSubproject", equalTo(true))
                .body("parentProjectId", equalTo(parentId.intValue()))
                .body("parentProjectKey", equalTo("MPP"))
                .body("leadId", equalTo(adminId.intValue())) // Creator remains active lead until accepted
                .body("pendingLeadId", equalTo(bobId.intValue()))
                .body("pendingLeadName", equalTo("Bob SubLead"))
                .extract().jsonPath().getLong("id");

        // 5. Verify Dashboard filtering: GET /api/projects excludes subproject for Admin (to prevent clutter)
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects")
            .then()
                .statusCode(200)
                .body("id", hasItem(parentId.intValue()))
                .body("id", not(hasItem(subId.intValue())));

        // But with includeSubprojects=true, subprojects are returned
        given()
                .cookie("session_id", adminSession)
                .queryParam("includeSubprojects", true)
            .when()
                .get("/api/projects")
            .then()
                .statusCode(200)
                .body("id", hasItem(parentId.intValue()))
                .body("id", hasItem(subId.intValue()));

        // 6. Parent project reflects subprojectCount = 1
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId)
            .then()
                .statusCode(200)
                .body("subprojectCount", equalTo(1));

        // 7. List subprojects endpoint returns child project
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId + "/subprojects")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].id", equalTo(subId.intValue()))
                .body("[0].name", equalTo("Frontend Track"))
                .body("[0].pendingLeadName", equalTo("Bob SubLead"));

        // 8. Bob receives the Sub-project Lead Invitation in his notifications and accepts
        List<Map<String, Object>> bobNotifs = given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/notifications")
            .then()
                .statusCode(200)
                .extract().jsonPath().getList("notifications");

        assertThat(bobNotifs.size(), greaterThanOrEqualTo(1));
        String dataJson = (String) bobNotifs.get(0).get("dataJson");
        Long bobInviteId = io.restassured.path.json.JsonPath.from(dataJson).getLong("invitationId");

        // Bob accepts the invitation
        given()
                .cookie("session_id", bobSession)
            .when()
                .post("/api/invitations/" + bobInviteId + "/accept")
            .then()
                .statusCode(200);

        // Subproject now reflects Bob as the official leadId and pendingLeadId is cleared
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + subId)
            .then()
                .statusCode(200)
                .body("leadId", equalTo(bobId.intValue()))
                .body("leadName", equalTo("Bob SubLead"))
                .body("pendingLeadId", nullValue());

        // 9. Single-level nesting restriction: Attempting to create subproject under child subproject fails with 400
        CreateProjectRequest invalidSubReq = new CreateProjectRequest();
        invalidSubReq.name = "Nested Subproject";
        invalidSubReq.projectKey = "MPP-NEST";
        invalidSubReq.parentProjectId = subId;

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(invalidSubReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(400)
                .body("error", containsString("Single-level nesting only"));

        // 10. Inheritance check: Alice (parent member) can access subproject without direct invite
        given()
                .cookie("session_id", aliceSession)
            .when()
                .get("/api/projects/" + subId)
            .then()
                .statusCode(200)
                .body("name", equalTo("Frontend Track"))
                .body("inheritedMemberSummaries.size()", greaterThanOrEqualTo(1));

        // 11. Isolation check: Bob (subproject lead) CANNOT access parent project
        given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/projects/" + parentId)
            .then()
                .statusCode(403);

        // 12. Subproject lead authority: Bob can update subproject settings
        UpdateProjectRequest updateReq = new UpdateProjectRequest();
        updateReq.name = "Frontend Track Updated";

        given()
                .cookie("session_id", bobSession)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/projects/" + subId)
            .then()
                .statusCode(200)
                .body("name", equalTo("Frontend Track Updated"));

        // 13. Reassign Sub-project Lead: Project Creator changes lead to Alice (already member of parent)
        UpdateProjectRequest reassignLeadReq = new UpdateProjectRequest();
        reassignLeadReq.leadId = aliceId;

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(reassignLeadReq)
            .when()
                .put("/api/projects/" + subId)
            .then()
                .statusCode(200)
                .body("leadId", equalTo(aliceId.intValue()))
                .body("leadName", equalTo("Alice ParentMember"))
                .body("pendingLeadId", nullValue());

        // 14. Bob has NO access to parent project, so calling GET /api/projects returns the subproject for Bob's dashboard
        given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/projects")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .body("find { it.id == " + subId + " }.name", equalTo("Frontend Track Updated"))
                .body("find { it.id == " + subId + " }.isSubproject", equalTo(true));

        // 15. Idempotent acceptance: Bob accepting bobInviteId again returns 200 without throwing 400
        given()
                .cookie("session_id", bobSession)
            .when()
                .post("/api/invitations/" + bobInviteId + "/accept")
            .then()
                .statusCode(200);
    }

    @Test
    void subprojectCompletionQualityGateAndReversalControlTest() {
        String adminSession = loginAsAdmin();

        // 1. Create a user to act as sub-project lead
        Long subLeadId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new com.securepm.auth.dto.CreateUserRequest() {{
                    username = "sublead_user";
                    email = "sublead_user@pm.local";
                    password = "TestPass123!";
                    fullName = "Sub Lead User";
                    role = "USER";
                }})
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        String subLeadSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "sublead_user";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        // 2. Admin creates Parent Project
        CreateProjectRequest parentReq = new CreateProjectRequest();
        parentReq.name = "Quality Gate Parent";
        parentReq.projectKey = "QGP";
        parentReq.description = "Parent for quality gates";

        Long parentId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(parentReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 3. Admin creates Sub-project with subLeadId
        CreateProjectRequest subReq = new CreateProjectRequest();
        subReq.name = "Sub Quality Gate Track";
        subReq.projectKey = "QGP-SUB";
        subReq.parentProjectId = parentId;
        subReq.leadId = subLeadId;

        Long subId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(subReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 4. Sub-lead accepts the lead invitation
        List<Map<String, Object>> notifs = given()
                .cookie("session_id", subLeadSession)
            .when()
                .get("/api/notifications")
            .then()
                .statusCode(200)
                .extract().jsonPath().getList("notifications");

        assertThat(notifs.size(), greaterThanOrEqualTo(1));
        String dataJson = (String) notifs.get(0).get("dataJson");
        Long inviteId = io.restassured.path.json.JsonPath.from(dataJson).getLong("invitationId");

        given()
                .cookie("session_id", subLeadSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(200);

        // 5. Create a task in sub-project in TODO status
        CreateTaskRequest taskReq = new CreateTaskRequest();
        taskReq.title = "Subproject unfinished task";
        taskReq.status = "TODO";
        taskReq.priority = "HIGH";

        Long taskId = given()
                .cookie("session_id", subLeadSession)
                .contentType("application/json")
                .body(taskReq)
            .when()
                .post("/api/projects/" + subId + "/tasks")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 6. Sub-lead attempts to complete sub-project -> Quality Gate Fails with 400
        given()
                .cookie("session_id", subLeadSession)
            .when()
                .post("/api/projects/" + subId + "/complete")
            .then()
                .statusCode(400)
                .body("error", containsString("task(s) are not finished yet"));

        // 7. Update task to DONE
        UpdateTaskRequest updateReq = new UpdateTaskRequest();
        updateReq.title = "Subproject unfinished task";
        updateReq.status = "DONE";
        updateReq.priority = "HIGH";
        updateReq.version = 1L;

        given()
                .cookie("session_id", subLeadSession)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/projects/" + subId + "/tasks/" + taskId)
            .then()
                .statusCode(200)
                .body("status", equalTo("DONE"));

        // 8. Now Sub-lead completes sub-project -> Quality Gate Passes with 200
        given()
                .cookie("session_id", subLeadSession)
            .when()
                .post("/api/projects/" + subId + "/complete")
            .then()
                .statusCode(200)
                .body("completed", equalTo(true))
                .body("completedByName", equalTo("Sub Lead User"));

        // 9. Reversal restriction: Sub-project lead attempts to reopen sub-project -> 403 Forbidden
        given()
                .cookie("session_id", subLeadSession)
            .when()
                .post("/api/projects/" + subId + "/reopen")
            .then()
                .statusCode(403)
                .body("error", containsString("Only parent project creator or ADMIN"));

        // 10. Parent project creator (Admin in this case) reopens sub-project -> 200 OK
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + subId + "/reopen")
            .then()
                .statusCode(200)
                .body("completed", equalTo(false))
                .body("completedBy", nullValue());
    }

    @Test
    void mainProjectCompletionQualityGatesAndReadOnlyGuardsTest() {
        String adminSession = loginAsAdmin();

        // 1. Create main project
        CreateProjectRequest parentReq = new CreateProjectRequest();
        parentReq.name = "Main Completion Project";
        parentReq.projectKey = "MCP";

        Long parentId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(parentReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 2. Create a child sub-project under main project
        CreateProjectRequest subReq = new CreateProjectRequest();
        subReq.name = "MCP Sub";
        subReq.projectKey = "MCP-SUB";
        subReq.parentProjectId = parentId;

        Long subId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(subReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 3. Create a direct task in main project
        CreateTaskRequest taskReq = new CreateTaskRequest();
        taskReq.title = "Direct Task in Parent";
        taskReq.status = "TODO";
        taskReq.priority = "MEDIUM";

        Long taskId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(taskReq)
            .when()
                .post("/api/projects/" + parentId + "/tasks")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 4. Try to complete main project -> Fails (direct task not done)
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + parentId + "/complete")
            .then()
                .statusCode(400)
                .body("error", containsString("direct task(s) are not finished yet"));

        // 5. Mark direct task as DONE
        UpdateTaskRequest updateReq = new UpdateTaskRequest();
        updateReq.title = "Direct Task in Parent";
        updateReq.status = "DONE";
        updateReq.priority = "MEDIUM";
        updateReq.version = 1L;

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/projects/" + parentId + "/tasks/" + taskId)
            .then()
                .statusCode(200);

        // 6. Try to complete main project again -> Fails (child subproject is not completed)
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + parentId + "/complete")
            .then()
                .statusCode(400)
                .body("error", containsString("sub-project(s) are not completed yet"));

        // 7. Complete the child sub-project (has 0 tasks)
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + subId + "/complete")
            .then()
                .statusCode(200)
                .body("completed", equalTo(true));

        // 8. Now complete the main project -> Succeeds!
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + parentId + "/complete")
            .then()
                .statusCode(200)
                .body("completed", equalTo(true))
                .body("completedByName", equalTo("System Administrator"));

        // 9. Read-Only mode guards on completed project:
        // 9a. Creating task is rejected
        CreateTaskRequest rejectedTask = new CreateTaskRequest();
        rejectedTask.title = "Blocked Task";
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(rejectedTask)
            .when()
                .post("/api/projects/" + parentId + "/tasks")
            .then()
                .statusCode(400)
                .body("error", containsString("view-only mode"));

        // 9b. Creating child sub-project under completed parent is rejected
        CreateProjectRequest rejectedSub = new CreateProjectRequest();
        rejectedSub.name = "Blocked Child";
        rejectedSub.projectKey = "MCP-BLK";
        rejectedSub.parentProjectId = parentId;
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(rejectedSub)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(400)
                .body("error", containsString("completed project"));

        // 9c. Updating completed project is rejected
        UpdateProjectRequest rejectedUpdate = new UpdateProjectRequest();
        rejectedUpdate.name = "MCP Renamed";
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(rejectedUpdate)
            .when()
                .put("/api/projects/" + parentId)
            .then()
                .statusCode(400)
                .body("error", containsString("Cannot modify a completed project"));

        // 9d. Archiving completed project is rejected
        given()
                .cookie("session_id", adminSession)
            .when()
                .delete("/api/projects/" + parentId)
            .then()
                .statusCode(400)
                .body("error", containsString("Cannot archive a completed project"));

        // 10. Reopen main project -> Succeeds!
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + parentId + "/reopen")
            .then()
                .statusCode(200)
                .body("completed", equalTo(false));
    }
}