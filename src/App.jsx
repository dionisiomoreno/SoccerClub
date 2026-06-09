return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Rotte pubbliche ── */}
      <Route path="/registrati" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* ── Super Admin ── */}
      <Route path="/superadmin" element={
        <PrivateRoute roles={['superadmin']}>
          <SuperAdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="clubs" element={<SuperAdminClubs />} />
        <Route path="licenses" element={<SuperAdminLicenses />} />
      </Route>

      {/* ── Area Genitori ── */}
      <Route path="/genitore" element={
        <PrivateRoute roles={['parent']}>
          <ParentLayout />
        </PrivateRoute>
      }>
        <Route index element={<ParentDashboard />} />
        <Route path="figlio"    element={<ParentChild />} />
        <Route path="pagamenti" element={<ParentPayments />} />
        <Route path="documenti" element={<ParentDocuments />} />
        <Route path="bacheca"   element={<ParentBacheca />} />
        <Route path="kit"       element={<ParentKit />} />
      </Route>

      {/* ── App principale ── */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="calciatori"   element={<PrivateRoute roles={['admin']}><Players /></PrivateRoute>} />
        <Route path="presenze"     element={<Attendances />} />
        <Route path="calendario"   element={<Calendar />} />
        <Route path="convocazioni" element={<Callups />} />
        <Route path="materiale"    element={<Materials />} />
        <Route path="documenti"    element={<Documents />} />
        <Route path="cedolini"     element={<PrivateRoute roles={['admin','mister','player_paid']}><Payslips /></PrivateRoute>} />
        <Route path="sanzioni"     element={<PrivateRoute roles={['admin']}><Sanctions /></PrivateRoute>} />
        <Route path="mister"       element={<PrivateRoute roles={['admin']}><Mister /></PrivateRoute>} />
        <Route path="distinta"     element={<PrivateRoute roles={['admin']}><MatchReport /></PrivateRoute>} />
        <Route path="chat"         element={<ChatPS />} />
        <Route path="sc/atleti"    element={<PrivateRoute roles={['admin','segreteria']}><YouthPlayers /></PrivateRoute>} />
        <Route path="sc/pagamenti" element={<PrivateRoute roles={['admin','segreteria']}><SCPayments /></PrivateRoute>} />
        <Route path="sc/magazzino" element={<PrivateRoute roles={['admin','segreteria']}><SCWarehouse /></PrivateRoute>} />
        <Route path="sc/bacheca"   element={<PrivateRoute roles={['admin','segreteria','mister']}><SCBacheca /></PrivateRoute>} />
        <Route path="sc/chat"      element={<SCChat />} />
        <Route path="impostazioni" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
